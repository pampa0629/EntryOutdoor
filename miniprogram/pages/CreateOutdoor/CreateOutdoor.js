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
    },

    // 常量定义
    Loadeds: ["轻装", "重装", "休闲"], // 枚举型：轻装、重装、休闲装
    Durings: ["一日", "两日", "三日", "四日", "五日", "多日"], // 活动时长枚举

    startDate: util.formatDate(new Date()), // 起始日期，格式化为字符串；只能从今天开始
    endDate: util.formatDate(util.nextDate(new Date(), 180)), // 截止日期，格式化为字符串，不保存；不能发半年之后的活动

    myself: {}, // 自己的报名信息
    isLeaderGroup: false, // 自己是否为领队组成员

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
    }
  },

  // 判断是否有任一被修改了
  anyModify(modifys) {
    return modifys.title || modifys.brief
  },

  onLoad: function() {
    console.log("CreateOutdoor.js onload()")
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

    this.setMyselfDefault()
  },

  setMyselfDefault() {
    // 设置myself 信息
    this.data.myself.userInfo = app.globalData.userInfo
    this.data.myself.personid = app.globalData.personid
    if(!this.data.myself.entryInfo) {
      this.setData({
        "myself.entryInfo": {knowWay:true} // 结构先定义出来，有了的时候不要清空
      })
    }
    
    console.log("this.data.myself: ")
    console.log(this.data.myself)
  },

  loadOutdoor: function(outdoorid) {
    console.log("loadOutdoor()")
    console.log("outdoorid: " + outdoorid)

    const self = this
    this.data.od.load(outdoorid, od => {
      self.setData({
        od: od,
        startDate: util.formatDate(new Date()), // 起始日期，只能从今天开始
        endDate: util.formatDate(util.nextDate(new Date(), 180)), // 截止日期，不能发半年之后的活动
        hasModified: false, // 刚load，没有修改
      }) 

      self.setChat(od.chat) // 判断留言

      // myself 得到自己的报名信息
      od.members.forEach((item, index) => {
        if (item.personid == app.globalData.personid) {
          self.setData({
            myself: item
          })
          console.log("myself: " + JSON.stringify(self.data.myself))
          if (item.entryInfo.status == "领队组") { // 判断自己是否为领队组成员
            self.setData({
              isLeaderGroup: true,
            })
          }
        }
      })

      self.loadDisclaimer() // 还需要单独处理“免责条款”的内容
      // 加载后就要构建画布生成分享图片文件
      self.createCanvasFile()

      // 队员以本活动为模板来创建活动
      if (((self.data.od.leader.personid != app.globalData.personid) && !self.data.isLeaderGroup) || app.globalData.newOutdoor) {
        self.newOutdoor()
        app.globalData.newOutdoor = false // 即时清空
      }
      self.createAutoInfo()
      self.checkPublish() // 判断一下是否能发布活动
    })
  },

  // 清空活动内容
  clearOutdoor(e) {
    console.log("clearOutdoor()")
    template.savePersonFormid(app.globalData.personid, e.detail.formId, null)

    const self = this
    wx.showModal({
      title: '确定清空？',
      content: '清空将导致活动全部内容恢复为默认值。是否确定清空？',
      success(res) {
        if (res.confirm) {
          console.log('用户点击确定')
          self.data.od.clear()
          self.setData({
            od: self.data.od,
            canPublish: false, // 判断是否可发布
            hasModified: true,
          })
          self.createAutoInfo() // 做必要的自动计算
        } else if (res.cancel) {
          console.log('用户点击取消')
        }
      }
    })
  },

  // 删除活动，记得清空缓存中的活动id
  deleteOutdoor(e) {
    console.log("deleteOutdoor()")
    template.savePersonFormid(app.globalData.personid, e.detail.formId, null)
    const self = this
    wx.showModal({
      title: '确定删除？',
      content: '删除将从数据库中彻底活动信息，不可恢复。是否确定删除？',
      success(res) {
        if (res.confirm) {
          console.log('用户点击确定')
          var outdoorid = self.data.od.outdoorid
          self.data.od.del(empty => {
            self.setData({
              od: empty
            })
            util.clearOutdoorID()
            self.clearPersonMyoutdoors(outdoorid)
            wx.switchTab({
              url: "../MyInfo/MyInfo"
            })
          })

        } else if (res.cancel) {
          console.log('用户点击取消')
        }
      }
    })
  },

  // 新建活动就是把 outdoor id清空，把关键信息删除
  newOutdoor: function() {
    console.log("newOutdoor()")

    this.data.od.setDefault4New() // 把活动的几个关键信息删除
    this.setData({
      od: this.data.od,
      canPublish: false, // 判断是否可发布
      hasModified: true, // 新建之后，马上可以保存
    })
    this.setMyselfDefault() // 自己也要重新恢复默认
    this.createAutoInfo() // 做必要的自动计算
    this.saveOutdoor() // 必须存起来，修改才不会丢失
  },

  onShow: function() {
    console.log("CreateOutdoor.js onShow()")
    const self = this
    var outdoorid = util.loadOutdoorID()
    self.checkLogin()

    console.log("outdoorid: " + outdoorid)
    if (outdoorid && outdoorid != self.data.od.outdoorid) {
      // 缓存中有id，且还和od中加载的outdoorid不一样，则说明要重新加载
      self.loadOutdoor(outdoorid)
    } else if (!outdoorid) { // id为空，则新创建活动
      self.newOutdoor()
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
    this.calcLevel() // 计算强度
    this.createTitle() // 生成标题
  },

  // 根据各类信息，生成活动主题信息，修改whole
  createTitle: function() {
    console.log("createTitle")
    const self = this
    self.setData({
      "od.title.whole": odtools.createTitle(self.data.od.title, self.data.myself.userInfo.nickName),
    })
  },

  // 判断是否可以发布了
  checkPublish: function() {
    console.log("checkPublish()")
    console.log(this.data.od.title)
    console.log(this.data.od.meets)
    console.log(this.data.myself.entryInfo)
    var canPublish = false
    if (this.data.od.title.place // 必须有活动地点
      &&
      this.data.od.title.date // 必须有活动日期
      &&
      this.data.od.meets.length > 0 // 必须有集合地点
      &&
      this.data.myself.entryInfo &&
      this.data.myself.entryInfo.meetsIndex >= 0 // 领队必须选择了集合地点
      &&
      this.data.myself.entryInfo.meetsIndex < this.data.od.meets.length // 领队集合地点必须在集合点范围内
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
      title: '成行确认',
      content: '确认活动成行将给所有队员发送微信消息提醒',
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

  // stopEntry() {
  //   this.updateStatus("报名截止")
  // },

  // // 恢复报名
  // continueEntry: function() {
  //   this.updateStatus("已发布")
  // },

  // 发布活动
  publishOutdoor: function(e) {
    console.log("publishOutdoor()")
    template.savePersonFormid(app.globalData.personid, e.detail.formId, null)
    const self = this
    // 第一步：修改status
    this.setData({
      "od.status": "已发布"
    })
    // 第二步：调用 od 的publish
    console.log("this.data.myself:")
    console.log(this.data.myself)
    this.data.od.publish(this.data.myself, res => { 
      console.log(this.data.od)
      // 第三步：更新到persons表
      self.updatePersonMyoutdoors()
      // 第四步：给自己的订阅者发通知
      self.post2Subscriber()
    })
  },

  // 给自己的订阅者发消息
  post2Subscriber() {
    console.log("post2Subscriber()")
    const self = this
    if (!this.data.od.limits.isTest) { // 测试帖就不发消息了
      console.log("outdoorid: " + self.data.od.outdoorid)
      dbPersons.doc(app.globalData.personid).get().then(res => {
        console.log(res.data.subscribers)
        self.postRemainSubscribers(res.data.subscribers)
      })
    }
  },

  // 按照顺序来对订阅者发送消息
  postRemainSubscribers(subscribers) {
    console.log("postRemainSubscribers()")
    console.log(subscribers)
    const self = this
    var arr = Object.getOwnPropertyNames(subscribers)
    console.log("arr.length: " + arr.length)
    if (arr.length > 0) {
      var personid = arr[0]
      var acceptNotice = subscribers[personid].acceptNotice
      delete subscribers[personid]
      self.postOneSubscriber(personid, acceptNotice, res => {
        self.postRemainSubscribers(subscribers)
      })
    }
  },

  // 按照一个订阅者发送消息
  postOneSubscriber(personid, acceptNotice, callback) {
    console.log("postOneSubscriber()")
    cloudfun.unshiftPersonCared(personid, this.data.od.outdoorid, this.data.od.title.whole, res => {
      // 发微信消息 
      if (acceptNotice) {
        template.sendCreateMsg2Subscriber(personid, this.data.od.title.whole, this.data.od.outdoorid, app.globalData.userInfo.phone, res => {
          if (callback) {
            callback()
          }
        })
      } else if (callback) {
        callback()
      }
    })
  },

  // 保存 活动的更新信息
  saveModified: function(e) {
    console.log("saveModified()")
    template.savePersonFormid(app.globalData.personid, e.detail.formId, null)
    if (this.data.hasModified) {
      this.saveOutdoor()
    }
  },

  // 几个相关操作，都是更新一下 Outdoors表中的活动状态而已
  updateStatus: function(status) {
    this.setData({
      "od.status": status
    })
    this.data.od.saveItem("status")
  },

  saveOutdoor: function() {
    console.log("saveOutdoor()")
    const self = this

    // 活动记录是否已经创建了
    var isCreated = self.data.od.outdoorid ? true : false

    // od.save 内部会判断处理是update还是create
    this.data.od.save(self.data.myself, this.data.modifys, od => {
      self.setData({
        "od.members": od.members, // 队员信息要设置一下
        hasModified: false,
      })
      self.setModifys(false)
      util.saveOutdoorID(self.data.od.outdoorid)

      // 在成功保存outdoor之后，相应的一些处理
      if (self.data.od.status != "拟定中") { // 正在草拟中的活动，这里面的事情就都可以省略了
        self.createCanvasFile() // 把图片更新一下
      }

      // 这里处理 Person表中对应的MyOutdoors
      if (isCreated) {
        self.updatePersonMyoutdoors()
      } else {
        self.addPersonMyoutdoors()
      }
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

  // 删除活动后，需要把活动记录，在person表中删除
  clearPersonMyoutdoors(outdoorid) {
    dbPersons.doc(app.globalData.personid).get()
      .then(res => {
        let myOutdoors = res.data.myOutdoors
        for (var i in myOutdoors) {
          if (myOutdoors[i].id == outdoorid) {
            myOutdoors.splice(i, 1)
            break
          }
        }
        dbPersons.doc(app.globalData.personid).update({
          data: {
            myOutdoors: myOutdoors
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
    const self = this
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
    const self = this
    wx.showNavigationBarLoading()
    // 主要就刷新队员和留言信息
    dbOutdoors.doc(self.data.od.outdoorid).get().then(res => {
      self.setData({
        "od.members": res.data.members,
      })
      self.setChat(res.data.chat)
      wx.hideNavigationBarLoading()
      wx.stopPullDownRefresh()
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
    const self = this
    this.closePopup()
    console.log(self.data.shareCanvasFile)
    // options.from == "menu" &&     // options.type = "tap" from="button"
    if (self.data.od.outdoorid) { // 数据库里面有，才能分享出去
      return {
        title: self.data.od.title.whole,
        desc: '分享活动',
        imageUrl: self.data.shareCanvasFile,
        path: 'pages/EntryOutdoor/EntryOutdoor?outdoorid=' + self.data.od.outdoorid + "&leaderid=" + self.data.od.leader.personid
      }
    }
  },

  onShare2Circle: function() {
    const self = this
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
    this.checkPublish()
  },

  // 勾选是否认路
  checkKnowWay: function (e) {
    console.log(e)
    this.setData({
      "myself.entryInfo.knowWay": !this.data.myself.entryInfo.knowWay,
      hasModified: true,
    })
    console.log(this.data.myself.entryInfo.knowWay)
  },

  // 选择或改变集合地点选择
  changeMeets: function(e) {
    console.log(e)
    this.setData({
      "myself.entryInfo.meetsIndex": parseInt(e.detail),
      hasModified: true,
    })
    this.checkPublish()
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