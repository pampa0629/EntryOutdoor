const app = getApp()
const util = require('../../utils/util.js')
const lvyeorg = require('../../utils/lvyeorg.js')
const qrcode = require('../../utils/qrcode.js')
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
    outdoorid: null, // 页面活动已经存储到数据库中的活动id
    memOutdoorid: null, // 刚加载的活动，在数据库中的id，用来判断避免onShow中重复加载（与缓存中的id进行对比）
    canPublish: false, // 判断是否可发布，必须定义关键的几项：地点、日期、集合时间地点等,不保存
    hasModified: false, // 是否被修改了，可以保存起来
    modifys: { // 到底更新了哪些条目，这里做一个临时记录
      title:false, // 主题类消息
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

    title: { // 活动标题，通过下面子项随时自动生成；
      whole: null, // 自动生成，也存起来
      place: null, // String; 地点描述。必填
      date: null, //必填。util.formatDate(util.nextDate(new Date(), 5)), //Date; 活动日期，能自动判断出：周六/周日/非周末; 默认活动日期为：当天的五天后
      during: "一日", // 默认为一日活动
      // duringIndex: 0, // +1 为活动天数
      loaded: "轻装", // 枚举型：轻装、重装、休闲装
      level: 1.0, //自动生成； Float，活动强度，自动计算得到，计算公式：sqrt(addedLength* addedUp/ 100)
      addedLength: 10, //Int，累积距离，单位：公里，最小值1
      addedUp: 10, //Int，累积上升，单位：百米，最小值1
      adjustLevel: 100, // 活动强度调节系数 100%意味着不调节
    },
    startDate: util.formatDate(new Date()), // 起始日期，格式化为字符串；只能从今天开始
    endDate: util.formatDate(util.nextDate(new Date(), 180)), // 截止日期，格式化为字符串，不保存；不能发半年之后的活动

    route: { wayPoints:[]}, // 活动路线，包括途经点和轨迹文件
    meets: [], //集合点，可加多个
    traffic: null, // 交通方式
    members: [], // 已报名成员（含领队）
    myself:{}, // 自己的报名信息（作为领队组成员）
    leader: { // 领队的信息也要记录起来
      personid: null,
      userInfo: null,
      entryInfo: {
        meetsIndex: -1,
        knowWay: true, // 领队默认为认路
        status: "领队"
      },
    },
    brief: { // 活动简要介绍，分为文字和图片（多张）
      disc: "领队有点懒，什么也没介绍",
      pics: [], // {src:string} 云存储路径
    },
    limits: { // 领队设置的活动限定条件
      disclaimer: "" //免责条款
    },
    status: "拟定中", // 活动本身的状态，分为：拟定中，已发布，已成行，报名截止，已取消

    // 同步到网站的信息
    websites: {
      lvyeorg: { 
        //fid: null, // 版块id
        tid: null, // 帖子id
        keepSame: false, // 是否保持同步
        waitings: [], // 要同步但尚未同步的信息列表
      }
    },
    showPopup: false, // 分享弹出菜单
    cancelDlg: { // 活动取消对话框
      show: false,
      reason: "",
      Reasons: ["人数不够", "空气污染太重", "天气状况不适合户外活动", "领队临时有事","其他原因"],
    },
    chatStatus:"", // 留言状态：new，有新留言；self，有@我的留言，
    chatChange:false, 
    interval:null, // 计时器
    editTitle:false, // 开启基础信息编辑
  },
  
  openEditTitle(e){
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
    if (!app.globalData.hasUserInfo) { // 判断是否登录先
      wx.showModal({
        title: '发起活动需先登录',
        content: '小程序将自动切换到“我的信息”页面，请点击“微信登录”按钮登录；然后再回来创建活动',
        showCancel: false,
        confirmText: "知道了",
        complete: function(res) {
          wx.switchTab({
            url: '../MyInfo/MyInfo'
          })
        }
      })
      return; // 没有登录直接返回
    } else { // 貌似 onshow中加载即可，这里不需要加载
    //  this.loadOutdoorInTable(util.loadOutdoorID());
    }
  },

  loadOutdoorInTable: function(outdoorid) {
    console.log("loadOutdoorInTable")
    const self = this
    self.setDefault(); // 每次先把几个关键信息置空，并加载当前用户为leader
    // 判断是否应加载一个在数据库中的活动信息
    if (outdoorid != null && outdoorid.length > 0) {
      dbOutdoors.doc(outdoorid).get()
        .then(res => {
          self.setData({
            outdoorid: outdoorid,
            memOutdoorid: outdoorid, // 加载活动，记得设置memOutdoorid
            title: res.data.title,
            status: res.data.status,
            // route: res.data.route, // 做兼容性处理了
            meets: res.data.meets,
            leader: res.data.members[0], 
            members: res.data.members,
          })
          // 读取之前活动数据时的兼容性处理
          self.dealCompatibility(res);
          self.loadDisclaimer(); // 还需要单独处理“免责条款”的内容

          // 这里要判断从本地缓存中读取到的outdoorid是自己创建的，还是用来当模板的
          // 依据是 从数据库读取的myself是否为自己  
          if (self.data.myself.personid != app.globalData.personid) {
            self.newOutdoor(null); //不是自己，就等于要新建活动
          }
          self.createAutoInfo();
          self.checkPublish(); // 判断一下是否能发布活动
          self.keepSameWithWebsites() // 网站同步
        })
    } else { // 本地缓存没有id，则说明是要新创建活动
      self.newOutdoor(null);
      self.createAutoInfo();
    }
  },

  // 新建活动就是把 outdoor id清空，把关键信息删除
  newOutdoor: function(e) {
    if (e) { 
      console.log(e.detail)
      template.savePersonFormid(app.globalData.personid, e.detail.formId, null)
    }
    if (this.data.outdoorid) {
      this.setData({
        outdoorid: null,
      })
      this.setDefault();
    }
  },

  // 把几个关键设置为默认值即可，当新创建活动或者模板创建活动后调用
  setDefault: function() {
    const self = this
    // leader要设置为当前用户  
    self.data.leader.userInfo = app.globalData.userInfo;
    self.data.leader.personid = app.globalData.personid;
    self.data.myself = self.data.leader // 新创建活动，自己就是领队
    self.setData({
      canPublish: false, // 判断是否可发布
      hasModified: false, // 是否被修改了
      "title.date": null, // 新创建活动，关键是把日期置空了
      status: "拟定中",
    })
    self.setWebsitesDefault() // 把网址同步的设置置空
  },

  setWebsitesDefault: function() {
    this.setData({
      "websites.lvyeorg.tid": null,
      "websites.lvyeorg.waitings": [],
      "websites.lvyeorg.keepSame": (app.globalData.lvyeorgInfo ? app.globalData.lvyeorgInfo.keepSame : false),
    })
    console.log(this.data.websites)
  },

  onShow: function() {
    const self = this; 
    var outdoorid = util.loadOutdoorID()

    if (outdoorid != null && outdoorid != self.data.memOutdoorid) {
      // 缓存中有id，且还和内存中加载的outdoorid不一样，则说明要重新加载
      self.loadOutdoorInTable(outdoorid);
    }
  },

  // 读取原来创建的活动兼容性处理，发现null值，赋予一个合理的默认值即可
  dealCompatibility: function(res) {
    const self = this;
    if (!self.data.title.adjustLevel) {
      self.setData({
        "title.adjustLevel": 100,
      })
    }
    // brief 文字加图片 
    if (res.data.brief) {
      self.setData({
        brief: res.data.brief,
      })
    }
    // 可选择的活动最早和最晚日期
    self.setData({
      startDate: util.formatDate(new Date()), // 起始日期，只能从今天开始
      endDate: util.formatDate(util.nextDate(new Date(), 180)), // 截止日期，不能发半年之后的活动
    })
    // limits
    if (res.data.limits) {
      self.setData({
        limits: res.data.limits,
      })
    }
    // 领队认路情况：默认领队就是认路的
    self.setData({
      "leader.entryInfo.knowWay": true,
    })
    // 几日活动，老存储：durings duringIndex
    if (!res.data.title.during && res.data.title.durings) {
      self.setData({
        "title.during": res.data.title.durings[res.data.title.duringIndex],
      })
    }
    // 网站同步信息
    if (res.data.websites) {
      self.setData({
        websites: res.data.websites,
      })
    } else {
      self.setData({ // 没有的话，就置空，防止稀里糊涂的发帖
        websites: null,
      })
    }
    console.log(self.data.websites)
    // 交通方式
    if (res.data.traffic) {
      self.setData({
        traffic: res.data.traffic,
      })
    }
    // 活动路线，增加轨迹文件
    console.log(self.data.route)
    if (res.data.route instanceof Array) { // 说明是老格式
      self.setData({
        "route.wayPoints": res.data.route, // 途经点
        "route.trackFiles": [], // 轨迹文件
        "route.trackSites": [], // 网站轨迹
      })
    } else { // 新格式直接设置
      self.setData({
        route: res.data.route,
      })
    }
    // chat 
    self.setChat(res.data.chat)

    // 判断处理占坑过期的问题
    if(outdoor.calcRemainTime(self.data.title.date, res.data.limits.ocuppy,true) < 0) {
      outdoor.removeOcuppy(self.data.outdoorid, members => {
        self.setData({
          members: members
        })
      }) 
    }

    // myself 得到自己的报名信息
    res.data.members.forEach((item, index)=>{
      if (item.personid == app.globalData.personid) {
        self.setData({
          myself: item
        })
      }
    })
    
    // next 
  },

  loadDisclaimer: function() {
    const self = this
    // 如果Outdoors表中没有免责条款的内容，则试着从Person表读取
    if (!self.data.limits || !self.data.limits.disclaimer) {
      dbPersons.doc(app.globalData.personid).get()
        .then(res => {
          if (res.data.disclaimer) {
            self.setData({
              "limits.disclaimer": res.data.disclaimer,
            })
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
      "title.whole": outdoor.createTitle(self.data.title, self.data.leader.userInfo.nickName),
    })
  },

  // 判断是否可以发布了
  checkPublish: function() {
    this.setData({
      canPublish: this.data.title.place // 必须有活动地点
        &&
        this.data.title.date // 必须有活动日期
        &&
        this.data.meets.length > 0 // 必须有集合地点
        &&
        this.data.leader.entryInfo.meetsIndex >= 0 // 领队必须选择了集合地点
        &&
        this.data.leader.entryInfo.meetsIndex < this.data.meets.length // 领队集合地点必须在集合点范围内
    })
  },

  bindPlace: function(e) {
    console.log(e)
    this.setData({
      "title.place": e.detail,
      hasModified: true,
      "modifys.title": true,
    })
    this.createTitle()
    this.checkPublish()
  },

  bindDateChange: function(e) {
    this.setData({
      "title.date": e.detail.value,
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
      "title.during": self.data.Durings[e.detail.value],
      hasModified: true,
      "modifys.title": true,
    })
    this.calcLevel()
    this.createTitle()
  },

  bindChangeLoaded: function(e) {
    console.log(e)
    const self = this
    this.setData({
      "title.loaded": self.data.Loadeds[e.detail.value],
      hasModified: true,
      "modifys.title": true,
    })
    this.calcLevel()
    this.createTitle()
  },

  // 计算强度
  calcLevel: function() {
    const self = this
    this.setData({
      "title.level": outdoor.calcLevel(self.data.title)
    })
  },

  bindAddedLength: function(e) {
    this.setData({
      "title.addedLength": e.detail,
      hasModified: true,
      "modifys.title": true,
    })
    this.calcLevel()
    this.createTitle()
  },

  bindAddedUp: function(e) {
    this.setData({
      "title.addedUp": e.detail,
      hasModified: true,
      "modifys.title": true,
    })
    this.calcLevel()
    this.createTitle()
  },

  // 领队调节强度系数
  bindAdjustLevel: function(e) {
    this.setData({
      "title.adjustLevel": e.detail,
      hasModified: true,
      "modifys.title": true,
    })
    this.calcLevel()
    this.createTitle()
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
    if(this.data.cancelDlg.reason){
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
        confirmText:"知道了",
        showCancel:false,
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
    self.data.members.forEach((item, index) => {
        template.sendCancelMsg2Member(item.personid, self.data.title.whole, self.data.outdoorid, self.data.myself.userInfo.nickName, self.data.cancelDlg.reason) 
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
          var key = self.data.outdoorid + ".confirmOutdoor"
          if (!wx.getStorageSync(key) ) {
            console.log(key)
            wx.setStorageSync(key, true)
            // 给所有队员发活动成行通知，除了自己
            self.data.members.forEach((item, index)=>{
              template.sendConfirmMsg2Member(item.personid, self.data.outdoorid, self.data.title.whole, self.data.members.length, self.data.myself.userInfo.nickName) 
            })
          }
        } else if (res.cancel) {
          console.log('用户点击取消')
        }
      }
    })
  },

  stopEntry(){
    this.updateStatus("报名截止")
  },

  // 恢复报名
  continueEntry: function() {
    this.updateStatus("已发布")
  },

  // 在活动还没有发布的时候，保存活动草稿
  saveDraft: function(e) {
    console.log(this.data.outdoorid)
    console.log(e.detail.formId)
    template.savePersonFormid(app.globalData.personid, e.detail.formId, null)
    if (this.data.hasModified) {
      console.log("saveDraft")
      this.saveOutdoor("拟定中", false)
    }
  },

  // 发布活动
  publishOutdoor: function(e) {
    console.log(e.detail.formId)
    template.savePersonFormid(app.globalData.personid, e.detail.formId, null)
    if (this.data.status != "已发布") {
      console.log("publishOutdoor")
      this.saveOutdoor("已发布", true)
    }
  },

// 给自己的订阅者发消息
  post2Subscribe() {
    const self = this
    console.log("outdoorid: "+self.data.outdoorid)
    dbPersons.doc(app.globalData.personid).get().then(res => {
      for (var key in res.data.subscribers) {
        console.log("key: " + key);
        console.log(res.data.subscribers[key]);
        // 加到cared列表中
        cloudfun.unshiftPersonCared(key, self.data.outdoorid, self.data.title.whole)
        
        // 发微信消息
        if (res.data.subscribers[key].acceptNotice) {
          template.sendCreateMsg2Subscriber(key, self.data.title.whole, self.data.outdoorid, app.globalData.userInfo.phone)
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
      status: status
    })
    cloudfun.updateOutdoorStatus(self.data.outdoorid, self.data.status, res=>{
      // 同步到网站
      self.data.modifys.status = true // 标记一下：活动状态改变了
      self.keepSameWithWebsites()
    })
  },

  // 更新信息
  updateOutdoorInTable: function (isPublishing) {
    const self = this;
    console.log(self.data.route)
    // 必须先刷新一下成员，不然容易覆盖
    dbOutdoors.doc(self.data.outdoorid).get().then(res=>{
      self.setData({
        members:res.data.members,
      })
      // 找到自己的index，并更新信息
      self.data.members.forEach((item, index)=>{
        if(item.personid == self.data.myself.personid){
          self.setData({
            ["members[" + index + "]"]: self.data.myself // 自己的信息更新一下
          })
        }
      })
      // dbOutdoors.doc(self.data.outdoorid).update({ 
      //   data: {
      //     title: self.data.title,
      //     route: _.set(self.data.route),
      //     meets: self.data.meets,
      //     traffic: self.data.traffic,
      //     status: self.data.status,
      //     members: self.data.members,
      //     brief: self.data.brief,
      //     limits: self.data.limits,
      //   }
      cloudfun.updateOutdoor(self.data.outdoorid, self.data, res=>{
        self.afterSaveOutdoor(isPublishing);
        // 这里还应该把 Person表中对应的MyOutdoors中的title更新一下
        self.updatePersonMyoutdoors();
      })
    })
  },

  // 创建活动信息记录
  createOutdoorInTable: function (isPublishing) {
    const self = this;
    // 先把领队的信息从数据库中调出来
    var personid = app.globalData.personid; // util.loadPersonID();
    dbPersons.doc(personid).get()
      .then(res => {
        self.data.leader.userInfo = res.data.userInfo;
        self.data.leader.personid = personid;
        var members = [self.data.leader];
        // 处理免责条款内容
        if (res.data.disclaimer) {
          self.data.limits.disclaimer = res.data.disclaimer
        }
        dbOutdoors.add({ // 没有outdoor id,则新加一条记录
          data: {
            title: self.data.title,
            route: self.data.route,
            meets: self.data.meets,
            traffic: self.data.traffic,
            members: members, // 写入领队信息
            status: self.data.status,
            brief: self.data.brief,
            limits: self.data.limits,
            websites: self.data.websites, // 这里得记录当前用户状态
          }
        }).then(res => {
          self.setData({
            outdoorid: res._id, // 活动表id
          })
          self.afterSaveOutdoor(isPublishing);

          // 发布成功，就需要往person表中追加活动id
          dbPersons.doc(app.globalData.personid).get()
            .then(resPerson => { // 先取出原来
              // 追加活动id和标题
              resPerson.data.myOutdoors.unshift({
                id: self.data.outdoorid,
                title: self.data.title.whole
              })
              dbPersons.doc(app.globalData.personid).update({
                data: {
                  myOutdoors: resPerson.data.myOutdoors
                }
              })
            })
        }).catch(console.error)
      })
  },

  saveOutdoor: function(status, isPublishing) {
    const self = this;
    self.setData({
      status: status,
    })

    if (self.data.outdoorid) { // 有outdoorid,说明Outdoors数据库中已经有记录,更新信息就好
      self.updateOutdoorInTable(isPublishing)
    } else {
      self.createOutdoorInTable(isPublishing)
    }
    self.setData({
      hasModified: false
    })
  },

  // 在成功保存outdoor之后，相应的一些处理，包括id和brief中的照片
  afterSaveOutdoor: function(isPublishing) {
    const self = this;
    util.saveOutdoorID(self.data.outdoorid)
    self.data.memOutdoorid = self.data.outdoorid;
    self.copyPics(); // 把照片中不是自己的，拷贝一份给自己用
    if (isPublishing) { // 第一次发布，需要给订阅者发消息
      self.post2Subscribe()
    } else if (self.data.modifys.title || self.data.modifys.meets){ 
      // 非第一次发布，如果包括活动重要信息修改，则要给全体队员发送消息提示
      self.data.members.forEach((item, index) => {
        template.sendModifyMsg2Member(item.personid, self.data.outdoorid, self.data.title.whole,  self.data.myself.userInfo.nickName, self.data.modifys) 
      })
    }
    // 这里处理和ORG网站同步的事情
    self.keepSameWithWebsites()
  },

  // 判断是否需要与网站同步
  keepSameWithWebsites: function () {
    const self = this
    console.log("keepSameWithWebsites")
    console.log(self.data.websites)
    if (self.data.websites && self.data.websites.lvyeorg 
      && (self.data.websites.lvyeorg.keepSame || self.data.websites.lvyeorg.tid) // 设置要同步或已同步过
      && self.data.outdoorid // 活动id必须有了
    ) {
      this.keepSameWithLvyeorg() // 同步到org上
    } else { // 不同步也要把修改信息给抹掉
      this.setModifys(false)
    }
  },

  // 这里处理和ORG网站同步的事情
  keepSameWithLvyeorg: function() {
    const self = this
    console.log(self.data.websites)
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
    if (!self.data.websites.lvyeorg.tid && self.data.websites.lvyeorg.keepSame && (self.data.status == "已发布" || self.data.status == "已成行") ) { // 没有tid，则必须有keepSame，同时还必须是“已发布”或“已成行”状态的活动
      lvyeorg.addThread(self.data.outdoorid, self.data, app.globalData.lvyeorgInfo.isTesting, tid => {
        if (tid) {
          self.data.websites.lvyeorg.tid = tid
          lvyeorg.postWaitings(self.data.outdoorid, tid, null)
        } else { // 发帖失败，则以后再发；这里似乎没有什么好干的事情
        }
      })
    } else if (self.data.websites.lvyeorg.tid) {
      // 有tid，则先把waitings发出去
      lvyeorg.postWaitings(self.data.outdoorid, self.data.websites.lvyeorg.tid, callback => {
        // 最后 发布更新信息
        self.postModifys()
      })
    }
  },

  // 保存修改时，在org网站跟帖发布信息
  postModifys: function () { 
    console.log("postModifys:function")
    console.log(this.data.modifys)
    if (this.anyModify(this.data.modifys)) { // 有修改，才有必要跟帖发布
      var addedMessage = "领队对以下内容作了更新，请报名者留意！"
      var message = lvyeorg.buildOutdoorMesage(this.data, false, this.data.modifys, addedMessage, this.data.websites.lvyeorg.allowSiteEntry) // 构建活动信息
      lvyeorg.postMessage(this.data.outdoorid, this.data.websites.lvyeorg.tid, addedMessage, message)
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
          if (item.id == self.data.outdoorid) {
            item.title = self.data.title.whole
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
    const self = this;
    wx.navigateTo({
      url: "../AboutOutdoor/PrintOutdoor?outdoorid=" + self.data.outdoorid + "&isLeader="+true
    })
  },

  chatOutdoor(){
    const self = this;
    wx.navigateTo({
      url: "../AboutOutdoor/ChatOutdoor?outdoorid=" + self.data.outdoorid + "&isLeader=" + true,
      complete (res) {
        self.setData({
          chatStatus: "",
        })
      }
    })
  },

  // 页面相关事件处理函数--监听用户下拉动作  
  onPullDownRefresh: function () {
    console.log("onPullDownRefresh")
    const self = this
    wx.showNavigationBarLoading();
    // 主要就刷新队员和留言信息
    dbOutdoors.doc(self.data.outdoorid).get().then(res=>{
      self.setData({
        members:res.data.members,
      })
      self.setChat(res.data.chat)
      wx.hideNavigationBarLoading();
      wx.stopPullDownRefresh();
    })
  },

  // 判断是否有新留言
  setChat(chat) {
    const self = this
    outdoor.getChatStatus(app.globalData.personid, app.globalData.userInfo.nickName, chat, status=>{
      self.setData({
        chatStatus: status,
      })
      console.log(self.data.chatStatus)
      if(self.data.chatStatus == "atme") {
        self.data.interval = setInterval(function () {
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

  onCancelShare(){
    this.setData({
      showPopup: false,
    })
  },

  onShareAppMessage: function(options) {
    const self = this;
    this.closePopup() 
    // options.from == "menu" &&     // options.type = "tap" from="button"
    if (self.data.outdoorid) { // 数据库里面有，才能分享出去
      return {
        title: self.data.title.whole,
        desc: '分享活动',
        path: 'pages/EntryOutdoor/EntryOutdoor?outdoorid=' + self.data.outdoorid
      }
    }
  },

  onShare2Circle: function() {
    const self = this;
    qrcode.share2Circle(self.data.outdoorid, self.data.title.whole, true)
    this.closePopup()
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
      "brief.disc": e.detail,
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
          "brief.disc": res.data,
          hasModified: true,
          "modifys.brief": true,
        })
      }
    })
  },

  // 调出上传照片页面
  clickUploadPics: function() {
    if (this.data.outdoorid) {
      wx.navigateTo({
        url: "UploadPics?outdoorid=" + this.data.outdoorid,
      })
    }
  },

  // 把照片中不是自己的，拷贝一份给自己用
  copyPics: function() {
    const self = this;
    if (self.data.brief && self.data.brief.pics.length > 0) {
      self.data.brief.pics.forEach((item, index) => {
        if (item.src.indexOf(self.data.outdoorid) == -1) { // -1 表示不是用当前活动id构建的，则需要下载，再上传图片
          wx.cloud.downloadFile({ // 下载先
            fileID: item.src
          }).then(res => {
            wx.cloud.uploadFile({ // 再上传到自己的活动目录下
              cloudPath: util.buildPicSrc(self.data.outdoorid, index),
              filePath: res.tempFilePath, // 小程序临时文件路径
            }).then(res => {
              item.src = res.fileID;
              self.setData({
                "brief.pics": self.data.brief.pics,
                hasModified: true,
              })
            }).catch(err => {
              console.log(err)
            })
          }).catch(err => {
            console.log(err)
          })
        }
      })
    }
  }, 

})