const app = getApp()
const util = require('../../utils/util.js')
const qrcode = require('../../utils/qrcode.js')
const odtools = require('../../utils/odtools.js')
const outdoor = require('../../utils/outdoor.js')
const template = require('../../utils/template.js')
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

    chatStatus: "", // 留言状态：new，有新留言；self，有@我的留言，
    chatChange: false,
    interval: null, // 计时器

    showPopup: false, // 分享弹出菜单
    entryError: "", // 报名时没有选择必要内容的错误提示
    Genders: ["GG", "MM"],
    nickErrMsg: "", // 报名的时候，个人信息是否正确的判断
    genderErrMsg: "",
    phoneErrMsg: "",
    formids: [],
  },

  onLoad: function(options) {
    console.log("EntryOutdoor.js onLoad()")
    this.setData({
      od: new outdoor.OD()
    })

    console.log(options)
    var outdoorid = util.getIDFromOptions(options)
    console.log(outdoorid)
    var leaderid = options.leaderid ? options.leaderid : null
    console.log(leaderid)
    // 存起来，以便其他地方能回到该活动
    util.saveOutdoorID(outdoorid)

    // 发现是领队是自己，则自动切换到发起活动页面
    if (leaderid && leaderid == app.globalData.personid) {
      wx.switchTab({
        url: '../CreateOutdoor/CreateOutdoor',
      })
    }
    this.checkLogin(outdoorid)

    wx.showShareMenu({ // 处理分享到群的情况
      withShareTicket: true
    })
  },

  // 得到formids数量
  async loadFormids() {
    let formids = await template.clearPersonFormids(app.globalData.personid)
    this.data.formids = formids ? formids : []
    this.setData({
      formids: this.data.formids,
    })
  },

  // 处理是否登录的问题
  async checkLogin(outdoorid) {
    console.log("checkLogin, outdoorid is:" + outdoorid)
    console.log(app.globalData)
    var isLogin = await app.ensureLogin()
    if (isLogin) {
      this.setData({
        userInfo: app.globalData.userInfo,
      })
      this.loadFormids()
    }
    this.loadOutdoor(outdoorid)
  },

  // 从数据库中装载信息 
  async loadOutdoor(outdoorid) {
    console.log("loadOutdoor(),  ",outdoorid)
    // 这里读取数据库，加载各类信息
    await this.data.od.load(outdoorid)
    const od = this.data.od
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
      "remains.occupy.time": odtools.calcRemainTime(this.data.od.title.date, this.data.od.limits.ocuppy, true),
      "remains.entry.time": odtools.calcRemainTime(this.data.od.title.date, this.data.od.limits.entry, false)
    })
    this.setData({
      "remains.occupy.text": odtools.buildRemainText(this.data.remains.occupy.time),
      "remains.entry.text": odtools.buildRemainText(this.data.remains.entry.time)
    })
    console.log(this.data.remains)
  },

  // 处理报名信息
  dealEntryInfo: function() {
    // 若只有一个集合地点，默认设置就好了
    if (this.data.od.meets.length <= 1) {
      this.setData({
        "entryInfo.meetsIndex": 0,
      })
    }
    // 从数据库中得到自己已经报名的状态
    var myself = util.findObj(this.data.od.members, "personid", app.globalData.personid)
    if (myself) {
      this.setData({
        entryInfo: myself.entryInfo,
      })
    }

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

  onPopup() {
    console.log("onPopup")
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
    console.log("onCancelShare")
    console.log(e)
    template.savePersonFormid(app.globalData.personid, e.detail.formId)
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
        self.data.shareCanvasFile =  shareCanvasFile
    })
  },

  onShareAppMessage: function(e) {
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
  onShare2Circle: function(e) {
    template.savePersonFormid(app.globalData.personid, e.detail.formId)
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
    this.setData({
      "entryInfo.status": status,
    })
    console.log(this.data.entryInfo)

    var member = util.createMember(app.globalData.personid, this.data.userInfo, this.data.entryInfo)
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

  // 把报名消息给自己和领队发送微信模板消息
  postEntryMsg() {
    console.log("postEntryMsg")
    const self = this
    const od = this.data.od
    let notice = self.data.od.limits.wxnotice

    // 给自己发微信消息
    if (true) {
      // 活动主题，领队联系方式，自己的昵称，报名状态，
      template.sendEntryMsg2Self(app.globalData.personid, od.title.whole, od.leader.userInfo.phone, app.globalData.userInfo.nickName, this.data.entryInfo.status, this.data.od.outdoorid)
    }

    console.log(notice)
    if (notice.accept) { // 领队设置接收微信消息
      if ((notice.entryCount > notice.alreadyCount) || (notice.fullNotice && this.data.od.entryFull())) { // 前几个报名，或者接收最后一个报名，才发送微信消息
        var key = this.data.od.outdoorid + "." + this.data.entryInfo.personid
        var count = parseInt(wx.getStorageSync(key))
        if (!count) {
          count = 0
        }
        console.log("count:" + count)
        if (count < 1) { // 每个人只发送一次
          template.sendEntryMsg2Leader(od.leader.personid, this.data.userInfo, this.data.entryInfo, od.title.whole, this.data.od.outdoorid)
          wx.setStorageSync(key, parseInt(count) + 1)
          // 发送结束，得往数据库里面加一条；还必须调用云函数
          // cloudfun.addOutdoorNoticeCount(self.data.od.outdoorid, 1)
          cloudfun.opOutdoorItem(self.data.od.outdoorid, "limits.wxnotice.alreadyCount", 1, "inc")
        }
      }
    }
  },

  // 替补
  tapBench: function(e) {
    this.doEntry("替补中", e.detail.formId)
  },

  // 占坑
  tapOcuppy: function(e) {
    this.doEntry("占坑中", e.detail.formId)
  },

  // 报名
  tapEntry: function(e) {
    this.doEntry("报名中", e.detail.formId)
  },

  // 检查报名选项是否完整
  checkEntryInfo() {
    const self = this
    if (self.data.entryInfo.meetsIndex < 0) {
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

  changeNickname: function(e) {
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
    const self = this
    self.setData({
      nickErrMsg: self.data.userInfo.nickName ? "" : "昵称不能为空",
    })
    let uniqueName = await person.getUniqueNickname(nickName, app.globalData.personid)
    if (nickName != uniqueName) {
      wx.showModal({
        title: '昵称已被占用',
        content: "您系统已为您自动取名为“" + uniqueName + "”，点击取消按钮重新取名",
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
    }
  },

  changeGender: function(e) {
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

  changePhone: function(e) {
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
        content: '请先输入正确的个人信息，然后再报名',
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
      if (this.checkFormids()) {
        this.entryOutdoorInner(this.data.entryTemp.status)
      }
    }
  },

  checkGender() {
    const self = this
    self.setData({
      genderErrMsg: self.data.userInfo.gender ? "" : "必须选择性别"
    })
  },

  dlgGetUserinfo(e) {
    console.log(e)
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
  //   console.log(e)
  //   const self = this
  //   self.setData({
  //     "userInfo.phone": e.detail,
  //   })
  //   self.checkPhone()
  // },

  // 检查微信消息数量是否够用
  checkFormids() {
    console.log("checkFormids()")
    var result = this.data.formids.length >= 6 ? true : false
    console.log(result)
    this.setData({
      showFormidDlg: !result,
    })

    return result
  },

  confirmFormidDlg() {
    console.log("confirmFormidDlg()")
    if (this.checkFormids()) {
      this.entryOutdoorInner(this.data.entryTemp.status)
    } else {
      wx.showModal({
        title: '请确认',
        content: '您确定数量够六个了吗？',
      })
    }
  },

  cancelFormidDlg() {
    console.log("cancelFormidDlg()")
    this.setData({
      showFormidDlg: false,
    })
  },

  tapAddFormid(e) {
    console.log("tapAddFormid()")
    template.savePersonFormid(app.globalData.personid, e.detail.formId)
    this.data.formids.push(template.buildOneFormid(e.detail.formId))
    this.setData({
      formids: this.data.formids,
    })
  },

  // 替补、占坑、报名，用同一个函数，减少重复代码
  doEntry(status, formid) {
    console.log("doEntry(): " + status)
    const self = this
    template.savePersonFormid(app.globalData.personid, formid)

    if (this.data.entryInfo.status != status && !self.data.entryError && !self.data.showLoginDlg && !self.data.showFormidDlg) {
      self.data.entryTemp = {
        status: status,
      }
      var check1 = this.checkEntryInfo()
      var check2 = check1 ? this.checkPersonInfo() : false
      var check3 = check2 ? this.checkFormids() : false
      console.log("check1: " + check1)
      console.log("check2: " + check2)
      console.log("check3: " + check3)
      if (check1 && check2 && check3) {
        this.entryOutdoorInner(status)
      }
    }
  },

  // 退出
  async tapQuit(e) {
    console.log("tapQuit()")
    template.savePersonFormid(app.globalData.personid, e.detail.formId)
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
      content: content})
  
    if (resModel.confirm) {
      console.log('用户点击确定')
      var selfQuit = true
      let resQuit = await this.data.od.quit(app.globalData.personid, selfQuit)
      // 删除Persons表中的entriedOutdoors中的对应id的item
      this.updateEntriedOutdoors(true)
      // 退出后还可以继续再报名
      this.setData({
        "entryInfo.status": "浏览中",
        "od.members": resQuit.members,
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
      this.data.interval = setInterval(function() {
        this.setData({
          chatChange: !this.data.chatChange,
        })
      }.bind(this), 800)
    } else {
      clearInterval(this.data.interval)
    }
  },

  // 选择或改变集合地点选择
  clickMeets: function(e) {
    console.log(e)
    const self = this
    this.setData({
      "entryInfo.meetsIndex": parseInt(e.target.dataset.name),
    })
    // 如果已经报名，则需要修改集合地点
    if (odtools.isEntriedStatus(self.data.entryInfo.status)) {
      self.entryOutdoorInner(self.data.entryInfo.status)
    }
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
    console.log("lookMeetMap()",index)
    const self = this
    // const index = self.data.entryInfo.meetsIndex
    // 选中了集合地点，并且有经纬度，才开启选择地图
    if (index >= 0 && self.data.od.meets[index].latitude) {
      var message = "同意授权“使用我的地理位置”才能调用微信地图；小程序不会记录您的位置，请放心"
      await util.authorize("userLocation", message)
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
  checkDisclaimer: function(e) {
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
  checkKnowWay: function(e) {
    const self = this
    console.log(self.data.entryInfo.knowWay)
    self.setData({
      "entryInfo.knowWay": !self.data.entryInfo.knowWay,
    })
    if (odtools.isEntriedStatus(self.data.entryInfo.status)) {
      self.entryOutdoorInner(self.data.entryInfo.status)
    }
  },

  // 关注活动
  careOutdoor: function() {
    console.log("careOutdoor()")
    this.dealCaredOutdoors(false)
  },

  //取消关注
  cancelCare: function() {
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
  toMainpage: function() {
    var url = app.globalData.hasUserInfo ? "../AboutOutdoor/HallOutdoor" : "../MyInfo/MyInfo"
    wx.switchTab({
      url: url,
    })
  },

  // 上传活动中的拍照
  async uploadPhotos(e) {
    console.log("uploadFaces()")
    template.savePersonFormid(app.globalData.personid, e.detail.formId)

    let resChoose = await promisify.chooseImage({
      sizeType: ['original', 'compressed'], //['original', 'compressed'], 
      sourceType: ['album', 'camera'], // ['album', 'camera'], 
    })
    console.log("chooseImage:", resChoose)
    var owner = { personid: app.globalData.personid, nickName:app.globalData.userInfo.nickName}
    let photos = await facetools.uploadOdPhotos(this.data.od.outdoorid, owner, resChoose.tempFiles)
    console.log("photos:", photos)
    facetools.aiOdPhotos(this.data.od.outdoorid, photos)
    this.setData({
      "od.photocount": this.data.od.photocount + Object.keys(photos).length
    })
  },

  lookPhotos(e) {
    template.savePersonFormid(app.globalData.personid, e.detail.formId)
    wx.navigateTo({
      url: "../AboutOutdoor/LookPhotos?outdoorid=" + this.data.od.outdoorid,
    })
  },

})