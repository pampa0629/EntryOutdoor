const app = getApp()
const util = require('../../utils/util.js')
const lvyeorg = require('../../utils/lvyeorg.js')
const qrcode = require('../../utils/qrcode.js')
const odtools = require('../../utils/odtools.js')
const outdoor = require('../../utils/outdoor.js')
const template = require('../../utils/template.js')
const cloudfun = require('../../utils/cloudfun.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
const dbPersons = db.collection('Persons')
const _ = db.command

Page({
  data: {
    od: null,
    canPublish: false, // 判断是否可发布，必须定义关键的几项：地点、日期、集合时间地点等,不保存
    hasModified: false, // 是否被修改了，可以保存起来
    modifys: { // 到底更新了哪些条目，这里做一个临时记录
      title: false, // 主题类消息
      brief: false, // 文字介绍，图片暂时不管
      meets: false, // 集合地点
      traffic: false, // 交通方式
      route: false, // 活动路线
      limits: false, // 各类限制条件
      disclaimer: false, // 免责条款
      status: false, // 活动状态变化
    },

    // 常量定义
    Loadeds: ["轻装", "重装", "休闲"], // 枚举型：轻装、重装、休闲装
    Durings: ["一日", "两日", "三日", "四日", "五日", "多日"], // 活动时长枚举
    
    startDate: util.formatDate(new Date()), // 起始日期，格式化为字符串；只能从今天开始
    endDate: util.formatDate(util.nextDate(new Date(), 180)), // 截止日期，格式化为字符串，不保存；不能发半年之后的活动

    myself: {}, // 自己的报名信息
    isLeaderGroup: false, // 自己是否为领队组成员
    leader: { // 领队的信息也要记录起来
      personid: null,
      userInfo: null,
      entryInfo: {
        meetsIndex: -1,
        knowWay: true, // 领队默认为认路
        status: "领队"
      },
    },
   
    showPopup: false, // 分享弹出菜单
    cancelDlg: { // 活动取消对话框
      show: false,
      reason: "",
      Reasons: ["人数不够", "空气污染太重", "天气状况不适合户外活动", "领队临时有事", "其他原因"],
    },
    chatStatus: "", // 留言状态：new，有新留言；self，有@我的留言，
    chatChange: false,
    interval: null, // 计时器
    editTitle: false, // 开启基础信息编辑
  },

  openEditTitle(e) {
    this.setData({
      editTitle: e.detail,
    })
  },

  // 设置临时修改项目全部为false或true，包括整体是否修改标记
  setModifys(result) {
    this.data.hasModified = result
    this.data.modifys = { // 到底更新了哪些条目，这里做一个临时记录
      title: result,
      brief: result,
      meets: result,
      traffic: result,
      route: result,
      limits: result,
      disclaimer: result,
      status: result,
    }
  },

  // 判断是否有任一被修改了
  anyModify(modifys) {
    return modifys.title || modifys.brief || modifys.meets || modifys.traffic || modifys.route || modifys.limits || modifys.disclaimer || modifys.status
  },

  onLoad: function() {
    console.log("onload()")
    this.data.od = new outdoor.OD()

    this.checkLogin()
    wx.showShareMenu({
      withShareTicket: true
    })
  },

  checkLogin() {
    var title = "发起活动需先登录"
    var content = "小程序将自动切换到“我的信息”页面，请点击“微信登录”按钮登录；然后再回来创建活动"
    app.checkLogin(title, content)

    // 设置myself 信息
    this.data.myself.userInfo = app.globalData.userInfo;
    this.data.myself.personid = app.globalData.personid;
    this.data.myself.entryInfo = {} // 结构先定义出来
    console.log("self.data.myself: ")
    console.log(this.data.myself)
  },

  loadOutdoorInTable: function(outdoorid) {
    console.log("loadOutdoorInTable，id is: " + outdoorid)
    const self = this
    
    this.data.od.load(outdoorid, od => {
      self.setData({
        od: od,
        leader: od.leader,
        startDate: util.formatDate(new Date()), // 起始日期，只能从今天开始
        endDate: util.formatDate(util.nextDate(new Date(), 180)), // 截止日期，不能发半年之后的活动
        "leader.entryInfo.knowWay": true, // 领队默认认路
        hasModified:false, // 刚load，没有修改
      })

      self.setChat(od.chat) // 判断留言

      // myself 得到自己的报名信息
      od.members.forEach((item, index) => {
        if (item.personid == app.globalData.personid) {
          self.setData({
            myself: item
          })
          if (item.entryInfo.status == "领队组") { // 判断自己是否为领队组成员
            self.setData({
              isLeaderGroup: true,
            })
          }
        }
      })

      self.loadDisclaimer(); // 还需要单独处理“免责条款”的内容
      // 加载后就要构建画布生成分享图片文件
      self.createCanvasFile()

      // 这里要判断从本地缓存中读取到的outdoorid是自己创建的，还是用来当模板的
      // 依据是 从数据库读取的leader是否为自己
      console.log("self.data.myself.personid: " + self.data.myself.personid)
      console.log("self.data.leader.personid: " + self.data.leader.personid)
      console.log("app.globalData.personid: " + app.globalData.personid)
      console.log("self.data.isLeaderGroup: " + self.data.isLeaderGroup)
      console.log("app.globalData.newOutdoor: " + app.globalData.newOutdoor)
      // 不是自己的，也不是领队组成员，就等于要新建活动
      // 如果是用户主动发起的模板创建，也需要新建活动
      if (((self.data.leader.personid != app.globalData.personid) && !self.data.isLeaderGroup) || app.globalData.newOutdoor) {
        self.newOutdoor(null);
        app.globalData.newOutdoor = false // 即时清空
      }
      self.createAutoInfo();
      self.checkPublish(); // 判断一下是否能发布活动
      self.keepSameWithWebsites() // 网站同步
    })
  },

  // 新建活动就是把 outdoor id清空，把关键信息删除
  newOutdoor: function(e) {
    console.log("newOutdoor: function(e)")
    console.log(e)
    if (e && e.detail && e.detail.formId) {
      console.log(e.detail)
      template.savePersonFormid(app.globalData.personid, e.detail.formId, null)
    }
    
    this.data.leader = this.data.myself // 新创建活动，自己就是领队
    this.data.od.setDefault4New() // 把活动的几个关键信息删除
    this.setData({
      od: this.data.od,
      canPublish: false, // 判断是否可发布
      hasModified: true, // 新建之后，马上可以保存
    })
    this.createAutoInfo(); // 做必要的自动计算
  },

  onShow: function() {
    console.log("CreateOutdoor.js onShow()")
    const self = this;
    var outdoorid = util.loadOutdoorID()
    self.checkLogin()
    
    console.log("outdoorid: " + outdoorid)
    if (outdoorid != null && outdoorid != self.data.od.outdoorid) {
      // 缓存中有id，且还和od中加载的outdoorid不一样，则说明要重新加载
      self.loadOutdoorInTable(outdoorid);
    } else if (outdoorid == null) { // id为空，则新创建活动
      self.newOutdoor(null);
    }
  },

  loadDisclaimer: function() {
    const self = this
    // 如果Outdoors表中没有免责条款的内容，则试着从Person表读取
    if (!self.data.od.limits || !self.data.od.limits.disclaimer) {
      dbPersons.doc(app.globalData.personid).get()
        .then(res => {
          if (res.data.disclaimer) {
            self.setData({
              "od.limits.disclaimer": res.data.disclaimer,
            })
            // 同时还应该保存到数据库中
            cloudfun.updateOutdoorDisclaimer(self.data.od.outdoorid, res.data.disclaimer)
          }
        })
    }
  },

  // 生成应 自动变化的内容，如强度值、标题等
  createAutoInfo: function() {
    console.log("createAutoInfo")
    this.calcLevel(); // 计算强度
    this.createTitle(); // 生成标题
  },

  // 根据各类信息，生成活动主题信息，修改whole
  createTitle: function() {
    console.log("createTitle")
    const self = this
    self.setData({
      "od.title.whole": odtools.createTitle(self.data.od.title, self.data.leader.userInfo.nickName),
    })
  },

  // 判断是否可以发布了
  checkPublish: function() {
    var canPublish = false
    if (this.data.od.title.place // 必须有活动地点
      &&
      this.data.od.title.date // 必须有活动日期
      &&
      this.data.od.meets.length > 0 // 必须有集合地点
      &&
      this.data.leader.entryInfo &&
      this.data.leader.entryInfo.meetsIndex >= 0 // 领队必须选择了集合地点
      &&
      this.data.leader.entryInfo.meetsIndex < this.data.od.meets.length // 领队集合地点必须在集合点范围内
    ) {
      canPublish = true
    }
    console.log(canPublish)
    this.setData({
      canPublish: canPublish
    })
  },

  bindPlace: function(e) {
    console.log(e)
    this.setData({
      "od.title.place": e.detail,
      hasModified: true,
      "modifys.title": true,
    })
    this.createTitle()
    this.checkPublish()
  },

  bindDateChange: function(e) {
    this.setData({
      "od.title.date": e.detail.value,
      hasModified: true,
      "modifys.title": true,
    })
    this.createTitle()
    this.checkPublish()
  },

  bindChangeDuring: function(e) {
    console.log(e)
    const self = this
    this.setData({
      "od.title.during": self.data.Durings[e.detail.value],
      hasModified: true,
      "modifys.title": true,
    })
    this.createAutoInfo()
  },

  bindChangeLoaded: function(e) {
    console.log(e)
    const self = this
    this.setData({
      "od.title.loaded": self.data.Loadeds[e.detail.value],
      hasModified: true,
      "modifys.title": true,
    })
    this.createAutoInfo()
  },

  // 计算强度
  calcLevel: function() {
    const self = this
    this.setData({
      "od.title.level": odtools.calcLevel(self.data.od.title)
    })
  },

  bindAddedLength: function(e) {
    this.setData({
      "od.title.addedLength": e.detail,
      hasModified: true,
      "modifys.title": true,
    })
    this.createAutoInfo()
  },

  bindAddedUp: function(e) {
    this.setData({
      "od.title.addedUp": e.detail,
      hasModified: true,
      "modifys.title": true,
    })
    this.createAutoInfo()
  },

  // 领队调节强度系数
  bindAdjustLevel: function(e) {
    this.setData({
      "od.title.adjustLevel": e.detail,
      hasModified: true,
      "modifys.title": true,
    })
    this.createAutoInfo()
  },

  closeCancelDlg(e) {
    console.log(e)
    this.setData({
      "cancelDlg.show": false
    })
  },

  confirmCancelDlg(e) {
    console.log(e)
    console.log(this.data.cancelDlg.reason)
    if (this.data.cancelDlg.reason) {
      this.updateStatus("已取消")
      // 活动取消，得给所有已报名队员发消息
      this.postCancel2Template()
      this.setData({
        "cancelDlg.show": false
      })
    } else {
      this.setData({
        "cancelDlg.show": true
      })
      wx.showModal({
        title: '必须选择',
        content: '取消活动必须选择一个取消原因',
        confirmText: "知道了",
        showCancel: false,
      })
    }
  },

  changeCancelReason(e) {
    console.log(e)
    this.setData({
      "cancelDlg.reason": e.detail
    })
  },

  // 把取消的事情通告所有人，包括自己
  postCancel2Template() {
    const self = this
    self.data.od.members.forEach((item, index) => {
      template.sendCancelMsg2Member(item.personid, self.data.od.title.whole, self.data.od.outdoorid, self.data.myself.userInfo.nickName, self.data.cancelDlg.reason)
    })
  },

  // 活动一旦发起，就不能删除，只能取消
  // 取消活动就是修改 Outdoors表中的status
  cancelOutdoor: function() {
    this.setData({
      "cancelDlg.show": true
    })
  },

  // 恢复活动
  resumeOutdoor: function() {
    this.updateStatus("已发布")
  },

  // 活动成行
  confirmOutdoor: function() {
    const self = this
    wx.showModal({
      title: '活动成行确认',
      content: '请确认活动成行。您可以再点击“截止”来截止报名',
      success(res) {
        if (res.confirm) {
          self.updateStatus("已成行")
          // 成行的活动通知，只发一次
          var key = self.data.od.outdoorid + ".confirmOutdoor"
          if (!wx.getStorageSync(key)) {
            console.log(key)
            wx.setStorageSync(key, true)
            // 给所有队员发活动成行通知，除了自己
            self.data.od.members.forEach((item, index) => {
              template.sendConfirmMsg2Member(item.personid, self.data.od.outdoorid, self.data.od.title.whole, self.data.od.members.length, self.data.myself.userInfo.nickName)
            })
          }
        } else if (res.cancel) {
          console.log('用户点击取消')
        }
      }
    })
  },

  stopEntry() {
    this.updateStatus("报名截止")
  },

  // 恢复报名
  continueEntry: function() {
    this.updateStatus("已发布")
  },

  // 在活动还没有发布的时候，保存活动草稿
  saveDraft: function(e) {
    console.log("saveDraft()")
    console.log(this.data.od.outdoorid)
    console.log(e.detail.formId)
    template.savePersonFormid(app.globalData.personid, e.detail.formId, null)
    if (this.data.hasModified) {
      console.log(this.data.leader)
      this.saveOutdoor("拟定中", false)
    }
  },

  // 发布活动
  publishOutdoor: function(e) {
    console.log(e.detail.formId)
    template.savePersonFormid(app.globalData.personid, e.detail.formId, null)
    if (this.data.od.status != "已发布") {
      console.log("publishOutdoor")
      this.saveOutdoor("已发布", true)
    }
  },

  // 给自己的订阅者发消息
  post2Subscribe() {
    const self = this
    console.log("outdoorid: " + self.data.od.outdoorid)
    dbPersons.doc(app.globalData.personid).get().then(res => {
      for (var key in res.data.subscribers) {
        console.log("key: " + key);
        console.log(res.data.subscribers[key]);
        // 加到cared列表中
        cloudfun.unshiftPersonCared(key, self.data.od.outdoorid, self.data.od.title.whole)

        // 发微信消息
        if (res.data.subscribers[key].acceptNotice) {
          template.sendCreateMsg2Subscriber(key, self.data.od.title.whole, self.data.od.outdoorid, app.globalData.userInfo.phone)
        }
      }
    })
  },

  // 保存 活动的更新信息
  saveModified: function(e) {
    console.log(e.detail.formId)
    template.savePersonFormid(app.globalData.personid, e.detail.formId, null)
    if (this.data.hasModified) {
      console.log("saveModified")
      this.saveOutdoor("已发布", false)
    }
  },

  // 几个相关操作，都是更新一下 Outdoors表中的活动状态而已
  updateStatus: function(status) {
    const self = this;
    self.setData({
      "od.status": status
    })
    cloudfun.updateOutdoorStatus(self.data.od.outdoorid, self.data.od.status, res => {
      // 同步到网站
      self.data.modifys.status = true // 标记一下：活动状态改变了
      self.keepSameWithWebsites()
    })
  },

  // 发布成功，就需要往person表中追加活动id
  addPersonMyoutdoors: function() {
    const self = this
    dbPersons.doc(app.globalData.personid).get()
      .then(res => { // 先取出原来
        // 追加活动id和标题
        res.data.myOutdoors.unshift({
          id: self.data.od.outdoorid,
          title: self.data.od.title.whole
        })
        dbPersons.doc(app.globalData.personid).update({
          data: {
            myOutdoors: res.data.myOutdoors
          }
        })
      })
  },

  saveOutdoor: function(status, isPublishing) {
    const self = this;
    self.setData({
      "od.status": status,
    })

    // 活动记录是否已经创建了
    var isCreated = self.data.od.outdoorid?true:false 

    // od.save 内部会判断处理是update还是create
    this.data.od.save(self.data.myself, od => {
      self.setData({
        "od.members": od.members, // 队员信息要设置一下
        hasModified: false,
      })
      util.saveOutdoorID(self.data.od.outdoorid)
      self.afterSaveOutdoor(isPublishing)

      if (isCreated) {
        // 这里还应该把 Person表中对应的MyOutdoors中的title更新一下
        self.updatePersonMyoutdoors()
      } else {
        self.addPersonMyoutdoors()
      }
    })
  },

  // 在成功保存outdoor之后，相应的一些处理
  afterSaveOutdoor: function(isPublishing) {
    const self = this;
    
    if (self.data.od.status != "拟定中") { // 正在草拟中的活动，这里面的事情就都可以省略了
      if (isPublishing) { // 第一次发布，需要给订阅者发消息
        self.post2Subscribe()
      } else if (self.data.modifys.title || self.data.modifys.meets) {
        // 非第一次发布，如果包括活动重要信息修改，则要给全体队员发送消息提示
        self.data.od.members.forEach((item, index) => {
          template.sendModifyMsg2Member(item.personid, self.data.od.outdoorid, self.data.od.title.whole, self.data.myself.userInfo.nickName, self.data.modifys)
        })
      }

      self.createCanvasFile() // 把图片更新一下
      // 这里处理和ORG网站同步的事情
      self.keepSameWithWebsites()
    }
  },

  // 判断是否需要与网站同步
  keepSameWithWebsites: function() {
    const self = this
    console.log("keepSameWithWebsites")
    console.log(self.data.od.websites)
    if (self.data.od.websites && self.data.od.websites.lvyeorg &&
      (self.data.od.websites.lvyeorg.keepSame || self.data.od.websites.lvyeorg.tid) // 设置要同步或已同步过
      &&
      self.data.od.outdoorid // 活动id必须有了
    ) {
      this.keepSameWithLvyeorg() // 同步到org上
    } else { // 不同步也要把修改信息给抹掉
      this.setModifys(false)
    }
  },

  // 这里处理和ORG网站同步的事情
  keepSameWithLvyeorg: function() {
    const self = this
    console.log(self.data.od.websites)
    console.log(app.globalData.lvyeorgInfo)
    if (!app.globalData.lvyeorgLogin) { // 尚未登录，则等待登录
      app.callbackLoginLvyeorg = (res) => {
        if (res.username) {
          self.post2Lvyeorg()
        }
      }
      app.loginLvyeOrg()
    } else { // 登录了直接发布信息就好
      self.post2Lvyeorg()
    }
  },

  // 内部处理函数，避免重复代码
  post2Lvyeorg: function() {
    console.log("post2Lvyeorg:function")
    const self = this
    // 没有 tid，则先生成tid；再处理waitings
    if (!self.data.od.websites.lvyeorg.tid && self.data.od.websites.lvyeorg.keepSame && (self.data.od.status == "已发布" || self.data.od.status == "已成行")) { // 没有tid，则必须有keepSame，同时还必须是“已发布”或“已成行”状态的活动 
      lvyeorg.addThread(self.data.od.outdoorid, self.data.od, app.globalData.lvyeorgInfo.isTesting || self.data.od.limits.isTest, tid => {
        if (tid) {
          self.data.od.websites.lvyeorg.tid = tid
          lvyeorg.postWaitings(self.data.od.outdoorid, tid, null)
        } else { // 发帖失败，则以后再发；这里似乎没有什么好干的事情
        }
      })
    } else if (self.data.od.websites.lvyeorg.tid) {
      // 有tid，则先把waitings发出去
      lvyeorg.postWaitings(self.data.od.outdoorid, self.data.od.websites.lvyeorg.tid, callback => {
        // 最后 发布更新信息
        self.postModifys()
      })
    }
  },

  // 保存修改时，在org网站跟帖发布信息
  postModifys: function() {
    console.log("postModifys:function")
    console.log(this.data.modifys)
    if (this.anyModify(this.data.modifys)) { // 有修改，才有必要跟帖发布
      var addedMessage = "领队对以下内容作了更新，请报名者留意！"
      var message = lvyeorg.buildOutdoorMesage(this.data.od, false, this.data.modifys, addedMessage, this.data.od.websites.lvyeorg.allowSiteEntry) // 构建活动信息
      lvyeorg.postMessage(this.data.od.outdoorid, this.data.od.websites.lvyeorg.tid, addedMessage, message)
      // 用完了得把modifys都设置为false
      this.setModifys(false)
      console.log(this.data.modifys)
    }
  },

  // 这里还应该把 Person表中对应的MyOutdoors中的title更新一下
  updatePersonMyoutdoors: function() {
    const self = this
    dbPersons.doc(app.globalData.personid).get()
      .then(res => {
        res.data.myOutdoors.forEach((item, index) => {
          if (item.id == self.data.od.outdoorid) {
            item.title = self.data.od.title.whole
          }
        })
        dbPersons.doc(app.globalData.personid).update({
          data: {
            myOutdoors: res.data.myOutdoors
          }
        })
      })
  },

  // 查看报名情况，同时可以截屏保存起来
  printOutdoor: function() {
    // 导航到 printOutdoor页面
    wx.navigateTo({
      url: "../AboutOutdoor/PrintOutdoor?outdoorid=" + this.data.od.outdoorid + "&isLeader=" + true
    })
  },

  chatOutdoor() {
    const self = this;
    wx.navigateTo({
      url: "../AboutOutdoor/ChatOutdoor?outdoorid=" + self.data.od.outdoorid + "&isLeader=" + true,
      complete(res) {
        self.setData({
          chatStatus: "",
        })
      }
    })
  },

  // 页面相关事件处理函数--监听用户下拉动作  
  onPullDownRefresh: function() {
    console.log("onPullDownRefresh()")
    console.log(self.data.od.outdoorid)
    const self = this
    wx.showNavigationBarLoading();
    // 主要就刷新队员和留言信息
    dbOutdoors.doc(self.data.od.outdoorid).get().then(res => {
      self.setData({
        "od.members": res.data.members,
      })
      self.setChat(res.data.chat)
      wx.hideNavigationBarLoading();
      wx.stopPullDownRefresh();
    })
  },

  // 判断是否有新留言
  setChat(chat) {
    const self = this
    odtools.getChatStatus(app.globalData.personid, app.globalData.userInfo.nickName, chat, status => {
      self.setData({
        chatStatus: status,
      })
      console.log(self.data.chatStatus)
      if (self.data.chatStatus == "atme") {
        self.data.interval = setInterval(function() {
          this.setData({
            chatChange: !this.data.chatChange,
          })
        }.bind(this), 800)
      } else {
        clearInterval(self.data.interval)
      }
    })
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

  onCancelShare() {
    this.setData({
      showPopup: false,
    })
  },

  createCanvasFile() {
    console.log("createCanvasFile")
    const self = this
    const canvas = wx.createCanvasContext('shareCanvas', self)
    // todo 分享到朋友圈的图片
    odtools.drawShareCanvas(canvas, self.data.od, shareCanvasFile => {
      self.setData({
        shareCanvasFile: shareCanvasFile,
      })
    })
  },

  onShareAppMessage: function(options) {
    console.log(options)
    const self = this;
    this.closePopup()
    console.log(self.data.shareCanvasFile)
    // options.from == "menu" &&     // options.type = "tap" from="button"
    if (self.data.od.outdoorid) { // 数据库里面有，才能分享出去
      return {
        title: self.data.od.title.whole,
        desc: '分享活动',
        imageUrl: self.data.shareCanvasFile,
        path: 'pages/EntryOutdoor/EntryOutdoor?outdoorid=' + self.data.od.outdoorid,
      }
    }
  },

  onShare2Circle: function() {
    const self = this;
    qrcode.share2Circle(self.data.od.outdoorid, self.data.od.title.whole, true)
    this.closePopup()
  },

  clickPay() {
    const self = this
    var url = '../AboutOutdoor/PayOutdoor?outdoorid=' + self.data.od.outdoorid
    console.log(url)
    wx.navigateTo({
      url: url,
    })
  },

  clickMeets: function(e) {
    console.log(e)
    this.setData({
      "myself.entryInfo.meetsIndex": parseInt(e.target.dataset.name),
      hasModified: true,
    })
  },

  // 选择或改变集合地点选择
  changeMeets: function(e) {
    console.log(e)
    this.setData({
      "myself.entryInfo.meetsIndex": parseInt(e.detail),
      hasModified: true,
    })
  },

  // 修改文字
  bindBriefText: function(e) {
    console.log(e)
    this.setData({
      "od.brief.disc": e.detail,
      hasModified: true,
      "modifys.brief": true,
    })
  },

  pasteBriefDisc: function() {
    const self = this
    wx.getClipboardData({
      success: function(res) {
        console.log(res.data)
        self.setData({
          "od.brief.disc": res.data,
          hasModified: true,
          "modifys.brief": true,
        })
      }
    })
  },

  // 调出上传照片页面
  clickUploadPics: function() {
    if (this.data.od.outdoorid) {
      wx.navigateTo({
        url: "UploadPics?outdoorid=" + this.data.od.outdoorid,
      })
    }
  },

})