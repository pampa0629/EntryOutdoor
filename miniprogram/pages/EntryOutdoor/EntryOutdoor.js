const app = getApp()
const util = require('../../utils/util.js')
const qrcode = require('../../utils/qrcode.js')
const odtools = require('../../utils/odtools.js')
const outdoor = require('../../utils/outdoor.js')
const message = require('../../utils/message.js')
const cloudfun = require('../../utils/cloudfun.js')
const person = require('../../utils/person.js')
const promisify = require('../../utils/promisify.js')
const facetools = require('../../utils/facetools.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
const dbPersons = db.collection('Persons')
const _ = db.command

Page({

  data: {
    od: null,

    entryInfo: { //报名信息
      status: "浏览中", // 报名状态：浏览中；占坑中；替补中；已报名；领队；
      meetsIndex: -1, // 选择的集合地点，若只有一个地点则无需选择
      agreedDisclaimer: false, // 认同免责条款
      knowWay: false, // 是否认路
    },
    myself: {}, // 供绿野童军报名时使用

    remains: {
      occupy: { // 距离占坑截止还剩余的时间（单位：分钟）
        time: null,
        text: ""
      },
      entry: { // 距离报名截止还剩余的时间（单位：分钟）
        time: null,
        text: ""
      },
    },
    entryFull: false, // 是否报名已满

    // 还是把userinfo和outdoors信息都保存下来方便使用
    userInfo: {},
    entriedOutdoors: [], // 报名的id列表
    caredOutdoors: [], // 关注的活动id列表
    hasCared: false, // 该活动是否已经加了关注
    isSubscribed:false, // 是否关注（订阅）了领队

    chatStatus: "", // 留言状态：new，有新留言；self，有@我的留言，
    chatChange: false,
    interval: null, // 计时器

    showPopup: false, // 分享弹出菜单
    entryError: "", // 报名时没有选择必要内容的错误提示
    Genders: ["GG", "MM"],
    nickErrMsg: "", // 报名的时候，个人信息是否正确的判断
    genderErrMsg: "",
    phoneErrMsg: "",

    size: app.globalData.setting.size, // 界面大小
  },

  async getLeaderID(outdoorid) {
    let res = await dbOutdoors.doc(outdoorid).field({
      leader: true, // 只要这个
    }).get()
    return res.data.leader.personid
  },

  // 处理私约活动
  async dealPrivate(outdoorid, options) {
    console.log("EntryOutdoor.dealPrivate()", outdoorid, options)
    console.log("options.private：", options.private)
    if (options.private || options.private == true || options.private == "true") {
      // 默认用openid，但如果发现有群，则用群id；避免有人在小程序启动后点击分享到群中的活动，从而用自己的openid把群id给占了
      // 存在的不足是：个人收到后，可以再次分享到一个群中
      if (this.getLeaderID(outdoorid) == app.globalData.openid) {
        return true // 领队自己查看，直接返回true；避免领队占用分享后的id匹配
      }

      console.log("app.globalData.openid:", app.globalData.openid)
      var id = app.globalData.openid // 默认为自己的id
      var name = "openid"
      console.log("app.globalData.options:", app.globalData.options)
      // 判断是否点击 分享到群里面的小程序卡片；若是，则用群id
      if (app.globalData.options.scene == 1044) {
        if (!app.globalData.groupOpenid) {
          app.globalData.groupOpenid = await app.getGroupId(app.globalData.options.shareTicket)
        }
        console.log("app.globalData.groupOpenid:", app.globalData.groupOpenid)
        id = app.globalData.groupOpenid
        name = "groupid"
      }
      console.log("id:", id)
      if (id) {
        let resOD = await dbOutdoors.doc(outdoorid).field({
          matchs: true, // 只要这个
        }).get()
        resOD.data.matchs = resOD.data.matchs ? resOD.data.matchs : {} // 不能为null
        console.log("resOD.data.matchs:", resOD.data.matchs)
        resOD.data.matchs[options.uuid] = resOD.data.matchs[options.uuid] ? resOD.data.matchs[options.uuid] : {}
        let resID = resOD.data.matchs[options.uuid][name]
        if (!resID) {
          cloudfun.opOutdoorItem(outdoorid, "matchs." + options.uuid + "." + name, id, "")
          resID = id
        }
        if (resID == id) {
          return true
        }
      }
      await promisify.showModal({
        title: '不能查看',
        content: '此活动为私约活动，只有领队直接转发才能查看；系统将自动转到活动大厅。您还可以试试再次点击领队发给你或发到群里的小程序，或者试试从内存中杀掉小程序，然后再直接点击分享的小程序进入活动。',
        showCancel: false,
      })
      wx.switchTab({ // 跳转到活动大厅
        url: '../AboutOutdoor/HallOutdoor',
      })
      return false
    }
    return true
  },

  onShow() {
    this.setData({
      size: app.globalData.setting.size
    })
  },

  async onLoad(options) {
    console.log("EntryOutdoor.onLoad()", options)
    var outdoorid = util.getIDFromOptions(options)
    console.log(outdoorid)
    var leaderid = options.leaderid ? options.leaderid : null
    console.log("leaderid:", leaderid)

    // 先确保登录
    await app.ensureLogin()

    // 发现是领队是自己，则自动切换到发起活动页面
    if (leaderid && leaderid == app.globalData.personid) {
      wx.switchTab({
        url: '../CreateOutdoor/CreateOutdoor',
      })
    }

    // 加载活动内容前，如果设置了私约活动，需要单独处理
    await this.dealPrivate(outdoorid, options)

    // 加载活动内容
    await this.loadOutdoor(outdoorid)

    if (this.data.od.limits.private) {
      wx.hideShareMenu()
    } else {
      wx.showShareMenu({ // 处理分享到群的情况
        withShareTicket: true
      })
    }

    // 判断是否订阅了领队
    let isSub = await person.isSubscribed(this.data.od.leader.personid, app.globalData.personid)
    this.setData({
      isSubscribed:isSub
    })
    console.log("isSubscribed:", isSub)
  },

  // 设置活动状态进程条
  setSteps(status) {
    const res = odtools.getSteps(status)
    this.setData({
      steps: res.steps,
      active: res.index,
    })
  },

  // 从数据库中装载信息 
  async loadOutdoor(outdoorid) {
    console.log("loadOutdoor(),  ", outdoorid)
    this.setData({
      od: new outdoor.OD()
    })
    // 这里读取数据库，加载各类信息
    await this.data.od.load(outdoorid)
    const od = this.data.od
    this.setSteps(od.status)
    // 设置活动信息
    this.setData({
      od: od,
      entryFull: odtools.entryFull(od.limits, od.members, od.addMembers)
    })
    // 处理剩余时间
    this.dealRemainTime()
    // 设置留言
    this.setChat(od.chat)
    // 处理报名信息
    this.dealEntryInfo()
    // 构建查看地图函数
    this.buildLookMapFun()
    // 加载后就要构建画布生成分享图片文件
    this.createCanvasFile()
    // 判断本活动是否已经被关注
    this.dealCared()
    // 存起来，以便其他地方能回到该活动
    util.saveOutdoorID(outdoorid)
  },

  // 判断本活动是否已经被关注
  dealCared() {
    const self = this
    // 从Person表中找到自己的信息
    if (app.globalData.personid) {
      dbPersons.doc(app.globalData.personid).get().then(res => {
        self.data.userInfo = res.data.userInfo
        self.data.entriedOutdoors = res.data.entriedOutdoors
        self.data.caredOutdoors = res.data.caredOutdoors
        self.data.caredOutdoors.forEach((item, index) => {
          if (item.id == self.data.od.outdoorid)
            self.setData({
              hasCared: true, // 该活动已经加了关注
            })
        })
      })
    }
  },

  // 处理剩余时间
  dealRemainTime() {
    console.log("dealRemainTime()")
    console.log("time limits: ", this.data.od.limits.entry)

    this.setData({
      // 单位要从分钟，转为毫秒
      "remains.occupy.time": odtools.calcRemainTime(this.data.od.title.date, this.data.od.limits.ocuppy, true) * 60 * 1000,
      "remains.entry.time": odtools.calcRemainTime(this.data.od.title.date, this.data.od.limits.entry, false) * 60 * 1000
    })
    console.log("remains:", this.data.remains)
  },

  // 处理报名信息
  dealEntryInfo() {
    console.log("dealEntryInfo()")

    // 若只有一个集合地点，默认设置就好了
    if (this.data.od.meets.length <= 1) {
      this.setData({
        "entryInfo.meetsIndex": "0",
      })
    }
    // 从数据库中得到自己已经报名的状态
    var me = util.findObj(this.data.od.members, "personid", app.globalData.personid)
    if (me) {
      // 兼容性处理：界面需要字符串类型，而数据库存储可能为数字
      if(typeof(me.entryInfo.meetsIndex) == "number") {
        me.entryInfo.meetsIndex = me.entryInfo.meetsIndex.toString()
      }

      this.setData({
        entryInfo: me.entryInfo,
        "myself.childs": me.childs, // 处理可能的童军
        "myself.parents": me.parents,
      })
    }
    console.log("entryInfo: ", this.data.entryInfo)

    // 做兼容性处理：是否同意免责条款
    if (!this.data.entryInfo.agreedDisclaimer) {
      this.setData({
        "entryInfo.agreedDisclaimer": false,
      })
    }
    // 做兼容性处理：是否认路
    if (!this.data.entryInfo.knowWay) {
      this.setData({
        "entryInfo.knowWay": false,
      })
    }
  },

  // 设置童军
  setChilds() {
    wx.navigateTo({
      url: '../AboutChild/ChildEntry?isMember=true&status=' + this.data.entryInfo.status,
    })
  },

  onPopup() {
    console.log("onPopup()")
    this.setData({
      showPopup: true,
    })
  },

  closePopup() {
    console.log("closePopup")
    this.setData({
      showPopup: false,
    })
  },

  onCancelShare(e) {
    console.log("onCancelShare()")
    this.setData({
      showPopup: false,
    })
  },

  createCanvasFile() {
    console.log("createCanvasFile")
    const self = this
    const shareCanvas = wx.createCanvasContext('shareCanvas', self)
    // todo 分享到朋友圈的图片
    odtools.drawShareCanvas(shareCanvas, self.data.od, shareCanvasFile => {
      self.data.shareCanvasFile = shareCanvasFile
    })
  },

  onShareAppMessage: function (e) {
    const self = this
    this.closePopup()
    if (self.data.od.outdoorid) { // 数据库里面有，才能分享出去
      return {
        title: self.data.od.title.whole,
        desc: '分享活动',
        imageUrl: self.data.shareCanvasFile,
        path: 'pages/EntryOutdoor/EntryOutdoor?outdoorid=' + self.data.od.outdoorid + "&leaderid=" + self.data.od.leader.personid
      }
    }
  },

  // 分享到朋友圈
  onShare2Circle() {
    const self = this
    qrcode.share2Circle(self.data.od.outdoorid, self.data.od.title.whole, false)
    this.closePopup()
  },

  // 刷新一下 entriedOutdoors 里面的内容：报名的话，把当前活动信息放到第一位；退出则要删除当前活动
  async updateEntriedOutdoors(isQuit) {
    console.log("updateEntriedOutdoors()", isQuit)
    var value = {
      id: this.data.od.outdoorid,
      title: this.data.od.title.whole
    }
    let res = await person.dealOutdoors(app.globalData.personid, "entriedOutdoors", value, isQuit)
    this.data.entriedOutdoors = res
  },

  // 报名就是在活动表中加上自己的id，同时还要在Person表中加上活动的id
  async entryOutdoorInner(status) {
    console.log("entryOutdoorInner()", status)
    var member = util.createMember(app.globalData.personid, this.data.userInfo, this.data.entryInfo, this.data.myself.childs, this.data.myself.parents)
    this.setData({
      "entryInfo.status": status,
    })

    let res = await this.data.od.entry(member)
    this.setData({ // 刷新队员信息
      "od.members": this.data.od.members,
    })
    if (status != "替补中" && res.status == "替补中") { // 被迫替补，则要给与弹窗提示
      this.setData({
        "entryInfo.status": res.status,
      })
      wx.showModal({
        title: '替补通知',
        content: '由于有人抢先点击报名了，报名人数已满，您不得不变为替补。若不愿替补，可随时退出；若前面队员退出或领队扩编，您将自动转为报名',
      })
    }

    // Person表中，还要把当前outdoorid记录下来
    this.updateEntriedOutdoors(false)

    // 首次报名，发送微信消息
    if (res.entry) {
      this.postEntryMsg()
    }
  },

  // 把报名消息给自己和领队发送微信消息
  postEntryMsg() {
    console.log("postEntryMsg()")
    const self = this
    const od = this.data.od
    let notice = self.data.od.limits.wxnotice

    // 给自己发微信模板消息，订阅消息是否要做，再定
    // if (true) {
    // 活动主题，领队联系方式，自己的昵称，报名状态，
    // template.sendEntryMsg2Self(app.globalData.personid, od.title.whole, od.leader.userInfo.phone, app.globalData.userInfo.nickName, this.data.entryInfo.status, this.data.od.outdoorid)
    // } 

    console.log(notice)
    if (notice.accept) { // 领队设置接收微信消息
      if (notice.entryCount > notice.alreadyCount) { // 前几个报名发送微信消息
        var key = this.data.od.outdoorid + "." + this.data.entryInfo.personid
        var count = parseInt(wx.getStorageSync(key))
        count = count ? count : 0 // 防止为null
        console.log("count:" + count)
        if (count < 1) { // 每个人只发送一次
          // 订阅消息
          var remark = this.data.userInfo.gender + "/" + this.data.userInfo.phone + "/第" + (parseInt(this.data.entryInfo.meetsIndex) + 1) + "集合地点"
          message.sendEntryMsg(od.leader.personid, od.outdoorid, od.title.whole, this.data.userInfo.nickName, util.formatTime(new Date()), remark)
          // 给领队发了消息，得从领队那里减掉一个消息数量
          cloudfun.opPersonItem(od.leader.personid, "messageCount", -1, "inc")

          wx.setStorageSync(key, parseInt(count) + 1)
          // 发送结束，得往数据库里面加一条；还必须调用云函数
          cloudfun.opOutdoorItem(self.data.od.outdoorid, "limits.wxnotice.alreadyCount", 1, "inc")
        }
      }
      // 满员通知 
      if (notice.fullNotice && this.data.entryFull) {
        message.sendEntryFull(od.leader.personid, od.outdoorid, od.title.whole, "报名已满，敬请留意")
      }
    }
  },

  // 替补
  tapBench() {
    this.doEntry("替补中")
  },

  // 占坑
  tapOcuppy() {
    this.doEntry("占坑中")
  },

  // 报名
  tapEntry() {
    this.doEntry("报名中")
  },

  // 检查报名选项是否完整
  checkEntryInfo() {
    // console.log("checkEntryInfo():", this.data.entryInfo.meetsIndex)
    const self = this
    if (parseInt(self.data.entryInfo.meetsIndex) < 0) {
      self.data.entryError += "请选择一个集合地点才能报名。"
    }
    if (!self.data.entryInfo.agreedDisclaimer) {
      self.data.entryError += "必须勾选同意活动条款和规则才能报名。"
    }
    if (self.data.entryError) {
      wx.showModal({
        title: '报名提示',
        content: self.data.entryError,
        showCancel: false,
        confirmText: "知道了",
        complete(res) {
          self.data.entryError = ""
        }
      })
    } else {
      return true
    }
  },

  // 判断是否有账号了
  checkPersonInfo() {
    // console.log("checkPersonInfo()",app.globalData,this.data.userInfo)
    const self = this
    var result = true
    if (!app.globalData.personid) { // 没账号的
      self.setData({
        nickErrMsg: self.data.userInfo.nickName ? "" : "昵称不能为空",
        genderErrMsg: self.data.userInfo.gender ? "" : "必须选择性别",
        phoneErrMsg: self.data.userInfo.phone ? "" : "手机号码不能为空",
      })
      result = false
    } else { // 有账号也要做检查
      if (!self.data.userInfo.nickName) { // 昵称为空
        self.setData({
          nickErrMsg: "昵称不能为空",
        })
        result = false
      }
      if (!self.data.userInfo.phone || self.data.userInfo.phone.length != 11) { // 电话号码不合格
        self.setData({
          phoneErrMsg: "手机号码不能为空且必须是11位有效号码",
        })
        result = false
      }
    }
    console.log("showLoginDlg:" + !result)
    self.setData({
      showLoginDlg: !result,
    })
    return result
  },

  changeNickname: function (e) {
    console.log(e)
    const self = this
    self.setData({
      "userInfo.nickName": e.detail,
      nickErrMsg: self.data.userInfo.nickName ? "" : "昵称不能为空",
    })
  },

  blurNickname(e) {
    console.log(e)
    this.checkNickname(this.data.userInfo.nickName)
  },

  // 这里判断昵称的唯一性和不能为空
  async checkNickname(nickName) {
    console.log("checkNickname()", nickName)
    const self = this
    if (!nickName) {
      self.setData({
        nickErrMsg: "昵称不能为空",
      })
    } else {
      let uniqueName = await person.getUniqueNickname(nickName, app.globalData.personid)
      console.log("uniqueName:", uniqueName)
      if (nickName != uniqueName) {
        // 昵称被占用了
        wx.showModal({
          title: '昵称已被占用',
          content: "您系统已为您自动取名为“" + uniqueName + "”，点击取消按钮可自己重新取名",
          success(res) {
            if (res.confirm) {
              self.setData({
                nickErrMsg: "",
                "userInfo.nickName": uniqueName,
              })
            } else if (res.cancel) {
              self.setData({
                nickErrMsg: "该昵称已被占用不能使用",
              })
            }
          }
        })
      } else {
        self.setData({
          nickErrMsg: "",
        })
      }
    }
  },

  changeGender: function (e) {
    console.log(e)
    this.setData({
      "userInfo.gender": e.detail,
    })
    this.checkGender()
  },

  clickGender(e) {
    console.log(e)
    this.setData({
      "userInfo.gender": e.target.dataset.name,
    })
    this.checkGender()
  },

  checkPhone() {
    const self = this
    if (self.data.userInfo.phone.length != 11) {
      self.setData({
        phoneErrMsg: "请输入11位手机号码"
      })
    } else {
      self.setData({
        phoneErrMsg: ""
      })
    }
  },

  changePhone: function (e) {
    console.log(e)
    const self = this
    self.setData({
      "userInfo.phone": e.detail.toString(), // 转为字符串
    })
    self.checkPhone()
  },

  cancelLoginDlg() {
    console.log("cancelLoginDlg")
    this.setData({
      showLoginDlg: false,
    })
  },

  // 判断各项目都ok了，然后创建表，设置app data
  async confirmLoginDlg() {
    console.log("confirmLoginDlg")
    var error = this.data.nickErrMsg + this.data.genderErrMsg + this.data.phoneErrMsg
    console.log(error)
    if (error) {
      wx.showModal({
        title: '补充个人信息',
        content: '请先输入正确的个人信息，然后再报名。错误原因：' + error,
        showCancel: false,
        confirmText: "知道了"
      })
      this.setData({
        showLoginDlg: true,
      })
    } else {
      let res = await person.createRecord(this.data.userInfo, app.globalData.openid)
      app.globalData.personid = res.personid
      app.globalData.userInfo = res.userInfo
      app.globalData.hasUserInfo = true
      this.setData({
        showLoginDlg: false,
      })
      // 最后还得继续报名才行
      this.entryOutdoorInner(this.data.entryTemp.status)
    }
  },

  checkGender() {
    const self = this
    self.setData({
      genderErrMsg: self.data.userInfo.gender ? "" : "必须选择性别"
    })
  },

  dlgGetUserinfo(e) {
    console.log("dlgGetUserinfo()", e)
    const self = this
    if (e.detail.userInfo) {
      self.setData({
        "userInfo.gender": util.fromWxGender(e.detail.userInfo.gender),
        "userInfo.nickName": e.detail.userInfo.nickName,
      })
      self.checkGender()
      self.checkNickname(self.data.userInfo.nickName)
    }
  },

  // dlgGetPhone(e) {
  //   console.log("dlgGetPhone()", e)
  //   self.setData({
  //     "userInfo.phone": e.detail.,
  //     "userInfo.nickName": e.detail.userInfo.nickName,
  //   })
  // }

  // 替补、占坑、报名，用同一个函数，减少重复代码
  doEntry(status) {
    console.log("doEntry()", status)
    const self = this

    // 订阅消息
    wx.requestSubscribeMessage({
      tmplIds: [
        message.OdStatusID, // 活动状态变更通知（活动成行/取消）
        message.EntryStatusID, // 报名状态变更通知（被领队驳回/缩编时报名变替补/强制退坑/替补转正等）
        message.OdInfoID // 活动重要提醒通知（活动基本信息被修改/换领队/有照片上传/领队留言等）
      ],
      complete(res) {
        console.log("complete: ", res)
      }
    })

    if (this.data.entryInfo.status != status && !self.data.entryError && !self.data.showLoginDlg) {
      self.data.entryTemp = {
        status: status,
      }
      var check1 = this.checkEntryInfo()
      var check2 = check1 ? this.checkPersonInfo() : false
      console.log("check1: " + check1)
      console.log("check2: " + check2)
      if (check1 && check2) {
        this.entryOutdoorInner(status)
      }
    }
  },

  // 退出
  async tapQuit() {
    console.log("tapQuit()")
    if (this.data.od.leader.personid == app.globalData.personid) {
      wx.showModal({
        title: '不能退出',
        content: '您是本活动领队，不能退出活动。您可以在“审核队员”页面转让领队，然后再退出；或者点击最上面的“取消”图标来取消活动。',
      })
      return
    }

    var content = '您已经点击“退出”按钮，是否确定退出本活动？'
    if (odtools.isNeedAA(this.data.od, this.data.entryInfo.status)) {
      content += "本活动已成行，退出若无人替补，则需要A共同费用，请慎重操作。"
    }

    let resModel = await promisify.showModal({
      title: '确定退出？',
      content: content
    })

    if (resModel.confirm) {
      console.log('用户点击确定')
      var selfQuit = true
      const od = this.data.od
      let resQuit = await od.quit(app.globalData.personid, selfQuit)
      // 删除Persons表中的entriedOutdoors中的对应id的item
      this.updateEntriedOutdoors(true)
      // 退出后还可以继续再报名
      this.setData({
        "entryInfo.status": "浏览中",
        "od.members": resQuit.members,
        entryFull: odtools.entryFull(od.limits, od.members, od.addMembers), // 退出后判断是否满员
      })
      if (resQuit.isAfee) {
        wx.showModal({
          title: '费用分摊提醒',
          content: '系统检测到您退出的活动已成行，且无人替补，请联系领队A费用，谢谢！',
        })
      }
    }
  },

  // 查看报名情况，同时可以截屏保存起来
  printOutdoor() {
    // 导航到 printOutdoor页面
    const self = this
    var isLeader = "&isLeader=" + false
    if (self.data.entryInfo.status == "领队") {
      isLeader = "&isLeader=" + true
    }
    wx.navigateTo({
      url: "../AboutOutdoor/PrintOutdoor?outdoorid=" + self.data.od.outdoorid + isLeader
    })
  },

  chatOutdoor() {
    const self = this
    var url = "../AboutOutdoor/ChatOutdoor?outdoorid=" + this.data.od.outdoorid + "&isLeader=" + false
    if (this.data.od.websites.lvyeorg.tid) {
      url += "&tid=" + this.data.od.websites.lvyeorg.tid
    }
    wx.navigateTo({
      url: url,
      complete(res) {
        self.setData({
          chatStatus: "",
        })
      }
    })
  },

  editOutdoor() {
    const self = this
    util.saveOutdoorID(self.data.od.outdoorid)
    wx.switchTab({
      url: "../CreateOutdoor/CreateOutdoor"
    })
  },

  newOutdoor() {
    console.log("EntryOutdoor.newOutdoor()")
    const self = this
    wx.showModal({
      title: '确定新建',
      content: '是否确定以本活动为模板新建活动？',
      success(res) {
        if (res.confirm) {
          console.log('用户点击确定')
          // 这里给 app 设置一下，知道是要新创建活动了
          app.globalData.newOutdoor = true
          self.editOutdoor()
        } else if (res.cancel) {
          console.log('用户点击取消')
        }
      }
    })
  },

  // 页面相关事件处理函数--监听用户下拉动作  
  async onPullDownRefresh() {
    console.log("onPullDownRefresh()")
    wx.showNavigationBarLoading()
    // 全刷一遍
    await this.loadOutdoor(this.data.od.outdoorid)
    wx.hideNavigationBarLoading()
    wx.stopPullDownRefresh()
  },

  // 判断是否有新留言
  setChat(chat) {
    let status = odtools.getChatStatus(app.globalData.personid, app.globalData.userInfo.nickName, chat)
    this.setData({
      chatStatus: status,
    })
    console.log(this.data.chatStatus)
    if (this.data.chatStatus == "atme") {
      this.data.interval = setInterval(function () {
        this.setData({
          chatChange: !this.data.chatChange,
        })
      }.bind(this), 800)
    } else {
      clearInterval(this.data.interval)
    }
  },

  // 选择或改变集合地点选择
  async clickMeets(e) {
    console.log("EntryOutdor.clickMeets()", e)
    var oldIndex = this.data.entryInfo.meetsIndex
    var newIndex = e.target.dataset.name.toString()
    if (oldIndex != newIndex) { // 改变了才干活

      // 如果已经报名，则需要：1）提示确认；2）确认后，修改集合地点+留言+修改数据库
      if (odtools.isEntriedStatus(this.data.entryInfo.status)) {

        // 先提示，要求确认一下
        var res = await promisify.showModal({
          title: '请确认',
          content: '请确认是否修改集合地点？',
        })
        console.log("res:", res)

        if (res.confirm) { // 点击确认
          // 修改界面
          this.setData({
            "entryInfo.meetsIndex": newIndex,
          })

          // 活动留言中提示领队
          var newIndexString = "我已改为“第" + (e.target.dataset.name + 1).toString() + "集合地点”，请领队留意"
          var chat = {
            personid: app.globalData.personid,
            msg: newIndexString + " @" + this.data.od.leader.userInfo.nickName,
            who: app.globalData.userInfo.nickName
          }
          cloudfun.opOutdoorItem(this.data.od.outdoorid, "chat.messages", chat, "push")
          // 同时还发送微信消息
          message.sendChatMsg(this.data.od.leader.personid, this.data.od.outdoorid, this.data.od.title.whole, app.globalData.userInfo.nickName, chat.msg)

          // 修改数据库
          this.entryOutdoorInner(this.data.entryInfo.status)

          await promisify.showModal({
            content: '修改信息已给领队发送活动留言和微信消息，但无法保证领队一定看到，请自行确保领队知晓。',
            showCancel: false
          })
        }
      } else { // 没报名时，直接改界面就好
        this.setData({
          "entryInfo.meetsIndex": newIndex,
        }) 
      }
    } else {
      this.setData({
        "entryInfo.meetsIndex": newIndex,
      }) 
    }
    console.log("entryInfo.meetsIndex:", this.data.entryInfo.meetsIndex)
  },

  // 构造查看地图的函数
  buildLookMapFun() {
    for (var i = 0; i < this.data.od.meets.length; i++) {
      let j = i; // 还必须用let才行
      this["lookMeetMap" + j] = () => {
        this.lookMeetMap(j)
      }
    }
  },

  // 查看集合地点的地图设置，并可导航
  async lookMeetMap(index) {
    console.log("lookMeetMap()", index)
    const self = this
    // 选中了集合地点，并且有经纬度，才开启选择地图
    if (index >= 0 && self.data.od.meets[index].latitude) {
      const latitude = self.data.od.meets[index].latitude
      const longitude = self.data.od.meets[index].longitude
      wx.openLocation({
        latitude,
        longitude,
        scale: 18
      })
    }
  },

  // 勾选同意免责条款
  checkDisclaimer: function (e) {
    const self = this
    if (this.data.entryInfo.status == "浏览中") {
      self.setData({
        "entryInfo.agreedDisclaimer": !self.data.entryInfo.agreedDisclaimer,
      })
    } else {
      wx.showModal({
        title: '不能取消',
        content: '您已报名，不能取消“同意条款和规则”选项',
        showCancel: false,
        confirmText: "知道了"
      })
    }
  },

  // 勾选是否认路
  checkKnowWay(e) {
    const self = this
    console.log(self.data.entryInfo.knowWay)
    self.setData({
      "entryInfo.knowWay": !self.data.entryInfo.knowWay,
    })
    if (odtools.isEntriedStatus(self.data.entryInfo.status)) {
      self.entryOutdoorInner(self.data.entryInfo.status)
    }
  },

  // 收藏关注活动
  careOutdoor() {
    console.log("careOutdoor()")
    this.dealCaredOutdoors(false)
  },

  //取消收藏
  cancelCare() {
    console.log("cancelCare()")
    this.dealCaredOutdoors(true)
  },

  // 处理关注/取关本活动
  // isCancel: true为取关，false为关注
  async dealCaredOutdoors(isCancel) {
    console.log("dealCaredOutdoors()", isCancel)
    // 关注活动，就是往Persons表中做一下记录
    if (app.checkLogin() && (this.data.hasCared == isCancel)) {
      var value = {
        id: this.data.od.outdoorid,
        title: this.data.od.title.whole
      }
      let res = person.dealOutdoors(app.globalData.personid, "caredOutdoors", value, isCancel)
      this.data.caredOutdoors = res
      this.setData({
        hasCared: !isCancel,
      })
    }
  },

  // 跳转到“订阅领队与微信通知”页面
  clickNotice() {
    wx.navigateTo({
      url: '../EntryOutdoor/SubscribeLeader?leaderid=' + this.data.od.leader.personid,
    })
  },

  clickPay() {
    const self = this
    wx.navigateTo({
      url: '../AboutOutdoor/PayOutdoor?outdoorid=' + self.data.od.outdoorid,
    })
  },

  // 回到首页
  toMainpage: function () {
    var url = app.globalData.hasUserInfo ? "../AboutOutdoor/HallOutdoor" : "../MyInfo/MyInfo"
    wx.switchTab({
      url: url,
    })
  },

  // 拷贝图文介绍
  copyBriefDisc() {
    wx.setClipboardData({
      data: this.data.od.brief.disc,
    })
  },

  // 预览活动宣传照片
  viewPics(e) {
    console.log("viewPics()", e)
    var urls = []
    this.data.od.brief.pics.forEach((item, index) => {
      urls.push(item.src)
    })
    console.log("urls:", urls)
    wx.previewImage({
      urls: urls,
      current: urls[e.currentTarget.dataset.pos]
    })
  },

  // 上传活动中的拍照
  async uploadPhotos() {
    console.log("uploadFaces()")

    let resChoose = await promisify.chooseImage({
      sizeType: ['original', 'compressed'], //['original', 'compressed'], 
      sourceType: ['album', 'camera'], // ['album', 'camera'], 
    })
    console.log("chooseImage:", resChoose)
    var owner = {
      personid: app.globalData.personid,
      nickName: app.globalData.userInfo.nickName
    }
    let count = await facetools.dealOdPhotos(this.data.od, owner, resChoose.tempFiles)
    this.setData({
      "od.photocount": this.data.od.photocount + count
    })
  },

  lookPhotos() {
    wx.navigateTo({
      url: "../AboutOutdoor/LookPhotos?outdoorid=" + this.data.od.outdoorid,
    })
  },

})