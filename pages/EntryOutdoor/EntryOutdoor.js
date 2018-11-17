const app = getApp()
const util = require('../../utils/util.js')
const qrcode = require('../../utils/qrcode.js')
const lvyeorg = require('../../utils/lvyeorg.js')
const outdoor = require('../../utils/outdoor.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
const dbPersons = db.collection('Persons')
const _ = db.command

Page({
  data: {
    outdoorid: null, // 活动id
    entryInfo: { //报名信息
      status: "浏览中", // 报名状态：浏览中；占坑中；替补中；已报名；领队；
      meetsIndex: -1, // 选择的集合地点，若只有一个地点则无需选择
      agreedDisclaimer: false, // 认同免责条款
      knowWay: false, // 是否认路
    },
    title: {}, // 活动主题信息，内容从数据库中读取
    route: [], // 活动路线，由多个站点（stop）组成
    meets: [], //集合点，可多个
    brief: {}, // 活动介绍，文字加图片
    limits: {}, // 领队设定的各类限制条款

    remains: {
      //remainOccupyTime: 10 * 24 * 60, // 距离占坑截止还剩余的时间（单位：分钟）
      //remainEntryTime: 10 * 24 * 60, // 距离报名截止还剩余的时间（单位：分钟）
      occupy: {
        time: null,
        text: ""
      },
      entry: {
        time: null,
        text: ""
      },
    },

    // 同步到网站的信息
    websites: {
      lvyeorg: {
        fid: null, // 版块id
        tid: null, // 帖子id
        waitings: [], // 要同步但尚未同步的信息列表
      }
    },

    status: null, //活动状态 
    members: null, // 队员报名信息，包括:personid,基本信息（userInfo)内容从Persons数据库中读取; 报名信息（entryInfo），报名时填写
    // 还是把userinfo和outdoors信息都保存下来方便使用
    userInfo: null,
    entriedOutdoors: null, // 报名的id列表
    caredOutdoors: null, // 关注的活动id列表
    hasCared: false, // 该活动是否已经加了关注
  },

  onLoad: function(options) {
    console.log(options)
    var outdoorid = null;
    if (options.outdoorid) {
      outdoorid = options.outdoorid
    } else if (options.scene) {
      console.log(options.scene)
      const scene = decodeURIComponent(options.scene)
      console.log(scene)
      outdoorid = options.scene
    }
    // 存起来，以便其他地方能回到该活动
    util.saveOutdoorID(outdoorid);

    if (app.globalData.openid == null || app.globalData.openid.length == 0) {
      app.openidCallback = (openid) => {
        app.globalData.openid = openid // 其实屁事没有，就是要等到app的onLaunch中得到openid
        this.checkLogin(outdoorid);
      }
    } else {
      this.checkLogin(outdoorid);
    }
  },

  // 处理是否登录的问题
  checkLogin: function(outdoorid) {
    if (app.globalData.hasUserInfo && app.globalData.userInfo != null) {
      this.setData({
        userInfo: app.globalData.userInfo,
      });
      this.loadInfo(outdoorid); // 这里调用 personid相关的代码
    } else {
      app.personidCallback = (personid, userInfo) => {
        if (personid != null) {
          this.setData({
            userInfo: userInfo,
          });
          this.loadInfo(outdoorid); // 这里调用 personid相关的代码
        } else {
          wx.showModal({
            title: '报名需先登录',
            content: '小程序将自动切换到“我的信息”页面，请点击“微信登录”按钮登录；然后再点击“回到最近的活动”按钮回到报名页面',
            showCancel: false,
            confirmText: "知道了",
            success: function(res) {
              wx.switchTab({
                url: '../MyInfo/MyInfo'
              })
            }
          })
        }
      }
    }
  },

  // 从数据库中装载信息
  loadInfo: function(outdoorid) {
    const self = this;
    // 这里得到活动id，读取数据库，加载各类信息
    self.data.outdoorid = outdoorid
    dbOutdoors.doc(self.data.outdoorid).get()
      .then(res => {
        self.setData({
          outdoorid: self.data.outdoorid,
          title: res.data.title,
          route: res.data.route,
          meets: res.data.meets,
          members: res.data.members,
          status: res.data.status,
          // brief,limits： 需要做兼容性处理，放到下面专门的函数中
        })
        self.dealOutdoorCompatibility(res) // 处理Outdoors表中数据的兼容性
        self.checkOcuppyLimitDate() // 处理占坑截止时间过了得退坑的问题

        if (res.data.meets.length <= 1) { // 若只有一个集合地点，默认设置就好了
          self.setData({
            "entryInfo.meetsIndex": 0,
          })
        }
        // 从数据库中得到自己已经报名的状态
        var index = self.findFromMembers(app.globalData.personid, self.data.members)
        if (index >= 0) {
          self.setData({
            entryInfo: self.data.members[index].entryInfo,
          })
          self.dealEntryInfoCompatibility() // 处理报名信息的兼容性
        }
      })

    // 从Person表中找到自己的信息
    dbPersons.doc(app.globalData.personid).get()
      .then(res => {
        self.data.userInfo = res.data.userInfo
        self.data.entriedOutdoors = res.data.entriedOutdoors
        self.data.caredOutdoors = res.data.caredOutdoors
        self.data.caredOutdoors.forEach((item, index) => {
          if (item.id == self.data.outdoorid)
            self.setData({
              hasCared: true, // 该活动已经加了关注
            })
        })
      })

    // 最后帮助把之前积累的信息同步到网站上
    self.postWaitings()
  },

  // 判断是否需要与网站同步
  postWaitings: function() {
    const self = this
    // 先判断本活动是否需要同步到org上
    if (self.data.websites && self.data.websites.lvyeorg.tid){
      // 登录后，先把已有的waitings信息同步一下
      if (!app.globalData.lvyeorgLogin) { // 尚未登录，则等待登录
        app.callbackLoginLvyeorg = (res) => {
          if(res.username){
            lvyeorg.postWaitings(self.data.outdoorid, self.data.websites.lvyeorg.tid)
          }
        }
        app.loginLvyeOrg() // 登录一下
      } else { // 登录了直接设置就好
        lvyeorg.postWaitings(self.data.outdoorid, self.data.websites.lvyeorg.tid)
      }
    }
  },

  // 处理占坑截止时间过了得退坑的问题
  checkOcuppyLimitDate: function() {
    const self = this
    if (self.data.limits.remainOccupyTime < 0) {
      self.data.members.forEach((item, index) => {
        if (item.entryInfo.status == "占坑中") {
          self.data.members.splice(index, 1)
        }
      })
      // 删完了还得存到数据库中，调用云函数写入
      wx.cloud.callFunction({
        name: 'updateMember', // 云函数名称
        data: {
          outdoorid: self.data.outdoorid,
          members: self.data.members
        }
      })
    }
  },

  // 处理Outdoors表中数据的兼容性
  dealOutdoorCompatibility: function(res) {
    const self = this;
    // brief 文字加图片 
    if (res.data.brief) {
      self.setData({
        brief: res.data.brief,
      })
    }
    //limits
    console.log(res.data)
    console.log(res.data.limits)
    if (res.data.limits) {
      self.setData({
        limits: res.data.limits,
      })
    }
    // 几日活动，老存储：durings duringIndex
    if (!res.data.title.during && res.data.title.durings && res.data.title.duringIndex) {
      self.setData({
        "title.during": res.data.title.durings[res.data.title.duringIndex],
      })
    }
    // 人数限制
    console.log("res.data.limits: ")
    console.log(res.data.limits)
    if (!res.data.limits || !res.data.limits.maxPerson) {
      self.setData({
        "limits.maxPerson": false,
      })
    }
    // 是否允许空降，默认不允许
    if (!res.data.limits || !res.data.limits.allowPopup) {
      self.setData({
        "limits.allowPopup": false,
      })
    }
    // 占坑和报名截止时间
    if (!res.data.limits) {
      res.data.limits = {
        occppy: null,
        entry: null
      }
    }
    self.setData({
      "remains.occupy.time": self.calcRemainTime(self.data.title.date, res.data.limits.ocuppy),
      "remains.entry.time": self.calcRemainTime(self.data.title.date, res.data.limits.entry)
    })
    self.setData({
      "remains.occupy.text": self.buildRemainText(self.data.remains.occupy.time),
      "remains.entry.text": self.buildRemainText(self.data.remains.entry.time)
    })

    // 网站同步信息
    if (res.data.websites) {
      self.setData({
        "websites": res.data.websites,
      })
    }

    // next 

  },

  buildRemainText: function(remainMinute) {
    var remainText = "";
    if (remainMinute > 0) {
      var remainDay = Math.trunc(remainMinute / 24.0 / 60.0)
      remainMinute -= remainDay * 24 * 60
      var remainHour = Math.trunc(remainMinute / 60)
      remainMinute = Math.trunc(remainMinute - remainHour * 60)
      remainText = remainDay + "天" + remainHour + "小时" + remainMinute + "分钟"
    }
    return remainText
  },

  // 计算当前距离截止时间还剩余的时间（单位：分钟）
  // 若 limitItem 为空，则说明为不限
  calcRemainTime: function(outdoorDate, limitItem) {
    console.log(limitItem)
    if (!limitItem) {
      limitItem = {
        date: "不限",
        time: null
      }
    }
    console.log(outdoorDate)
    console.log(limitItem)
    var outdoorMinute = Date.parse(util.Ymd2Mdy(outdoorDate)) / 1000.0 / 60 // 得到活动日期的分钟时间数
    var dayCount = util.getLimitDateIndex(limitItem.date)
    console.log("dayCount:" + dayCount)
    var minute = 24 * 60; // 一天多少分钟
    console.log(limitItem.time)
    if (limitItem.time) {
      var hour_minute = limitItem.time.split(":")
      minute = minute - (parseInt(hour_minute[0]) * 60 + parseInt(hour_minute[1]))
      console.log("hour_minute:" + hour_minute)
      console.log("minute:" + minute)
    }
    minute += (dayCount - 1) * 24 * 60 // 截止时间和活动日期两者之间间隔的分钟数
    console.log("minute" + minute)
    var limitMinute = outdoorMinute - minute // 截止时间的分钟数

    var nowMinute = Date.parse(new Date()) / 1000.0 / 60
    var remainMinute = limitMinute - nowMinute

    console.log(remainMinute)
    return remainMinute
  },


  // 处理报名信息的兼容性
  dealEntryInfoCompatibility: function() {
    const self = this
    if (!self.data.entryInfo.agreedDisclaimer) { // 是否同意免责条款
      self.setData({
        "entryInfo.agreedDisclaimer": false,
      })
    }
    if (!self.data.entryInfo.knowWay) { // 是否认路
      self.setData({
        "entryInfo.knowWay": false,
      })
    }
  },

  // 把当前的信息刷新到members中，以便后续写入数据库
  // 知道了，返回index，如果找不到，返回-1
  flushToMembers: function(personid, entryInfo, members) {
    var result = -1;
    members.forEach(function(item, index) {
      if (item.personid != null && item.personid == personid) {
        item.entryInfo = entryInfo
        result = index;
      }
    })
    return result;
  },

  // 从members找到personid，并返回 index，找不到，返回-1
  findFromMembers: function(personid, members) {
    // 这里要判断一下自己当前的报名状态
    var result = -1;
    members.forEach(function(item, index) {
      if (item != null && item.personid != null && item.personid == personid) {
        result = index
      }
    })
    return result;
  },

  onShareAppMessage: function(options) {
    const self = this;
    if (self.data.outdoorid) { // 数据库里面有，才能分享出去
      return {
        title: self.data.title.whole,
        desc: '分享活动',
        path: 'pages/EntryOutdoor/EntryOutdoor?outdoorid=' + self.data.outdoorid
      }
    }
  },

  // 分享到朋友圈
  onShare2Circle: function() {
    const self = this;
    qrcode.share2Circle(self.data.outdoorid, self.data.title.whole, false)
  },

  // 刷新一下 entriedOutdoors 里面的内容：报名的话，把当前活动信息放到第一位；退出则要删除当前活动
  updateEntriedOutdoors:function(isQuit){
    const self = this
    // 先保证把当前活动清除掉
    self.data.entriedOutdoors.forEach(function (item, index) {
      if (item.id == self.data.outdoorid) {
        self.data.entriedOutdoors.splice(index, 1);
      }
    })
    
    // 若非退出，则加到第一条
    self.data.entriedOutdoors.unshift({
      id: self.data.outdoorid,
      title: self.data.title.whole
    })

    // 最后更新数据库
    dbPersons.doc(app.globalData.personid).update({
      data: {
        entriedOutdoors: self.data.entriedOutdoors
      }
    })
  },

  // 报名就是在活动表中加上自己的id，同时还要在Person表中加上活动的id
  entryOutdoor: function(status) {
    const self = this;
    console.log("EntryOutdoors.js in entryOutdoor fun, status is:" + JSON.stringify(status, null, 2))
    // 再判断一下是否属于 修改报名的类型，即在“占坑”和“报名”中切换
    if (self.data.entryInfo.status == "占坑中" || self.data.entryInfo.status == "报名中") {
      // 属于的话，就只更新 Outdoors表members的entryInfo信息就好
      self.setData({
        "entryInfo.status": status,
      })

      // 还是先刷新一下members
      dbOutdoors.doc(self.data.outdoorid).get()
        .then(res => {
          // 修改members中personid位置的报名信息
          for (var i = 0; i < res.data.members.length; i++) {
            if (res.data.members[i].personid == app.globalData.personid) {
              res.data.members[i].entryInfo = self.data.entryInfo
            }
          }
          self.setData({
            members: res.data.members,
          })
          // 再调用云函数写入
          // 云函数
          wx.cloud.callFunction({
            name: 'updateMember', // 云函数名称
            data: {
              outdoorid: self.data.outdoorid,
              members: self.data.members
            }
          })

          self.updateEntriedOutdoors(false)
        })
    } else { // 完全新报名，增加一条记录
      // 先从Person表中找到自己的信息
      console.log(self.data.entryInfo)
      self.setData({
        "entryInfo.status": status,
        entryInfo: self.data.entryInfo,
      })
      console.log(self.data.entryInfo)

      var member = util.createMember(app.globalData.personid, self.data.userInfo, self.data.entryInfo)
      wx.cloud.callFunction({ // 把当前信息加入到 Outdoors的members中
        name: 'addMember', // 云函数名称
        data: {
          outdoorid: self.data.outdoorid,
          member: member
        },
        complete: res => {
          // 刷新一下队员列表
          dbOutdoors.doc(self.data.outdoorid).get()
            .then(res => {
              self.setData({
                members: res.data.members
              })
            })

          // Person表中，还要把当前outdoorid记录下来
          self.updateEntriedOutdoors(false)
        }
      })
    }

    // 把自己的报名信息同步到网站上
    self.postEntry2Websites(false)
  },

  // 把信息同步到网站上
  postEntry2Websites: function(isQuit) {
    const self = this
    console.log(self.data.websites)
    // 先判断活动可以同步
    if (self.data.websites && self.data.websites.lvyeorg 
      && self.data.websites.lvyeorg.keepSame || self.data.websites.lvyeorg.tid) {
      var message = lvyeorg.buildEntryMessage(self.data.userInfo, self.data.entryInfo, isQuit, false) // 构建报名信息
      console.log(message)
      console.log(app.globalData.lvyeorgLogin)
      if (app.globalData.lvyeorgLogin && self.data.websites.lvyeorg.tid) { // 登录了就直接发
        lvyeorg.postWaitings(self.data.outdoorid, self.data.websites.lvyeorg.tid, callback=>{
          lvyeorg.postMessage(self.data.outdoorid, self.data.websites.lvyeorg.tid, message)
        })
      } else if (app.globalData.lvyeorgInfo && !app.globalData.lvyeorgLogin && self.data.websites.lvyeorg.tid ) { // 注册了没登录，就登录一下
        app.callbackLoginLvyeorg = (res) => { // 设置回调
          if(res.username){
            console.log("app.callbackLoginLvyeorg")
            lvyeorg.postWaitings(self.data.outdoorid, self.data.websites.lvyeorg.tid, callback => {
              lvyeorg.postMessage(self.data.outdoorid, self.data.websites.lvyeorg.tid, message)
            })
          } else if (res.error) { // 登录失败也记录到waitings中
            lvyeorg.add2Waitings(self.data.outdoorid, message)    
          }
        }
        app.loginLvyeOrg() // 登录
      } else { // 没注册就记录到waitings中
        lvyeorg.add2Waitings(self.data.outdoorid, message)
      }
    }
  },

  // 替补
  tapBench: function() {
    this.entryOutdoor("替补中")
  },

  // 占坑
  tapOcuppy: function() {
    this.entryOutdoor("占坑中")
  },

  // 报名
  tapEntry: function() {
    this.entryOutdoor("报名中")
  },

  // 退出
  tapQuit: function() {
    const self = this;
    // 先重新获取members，再删除personid，再调用云函数
    // 刷新一下队员列表
    dbOutdoors.doc(self.data.outdoorid).get()
      .then(res => {
        self.setData({
          members: res.data.members
        })

        // 退出的时候应检查一下，如果自己不是替补，则把第一个替补改为“报名中”
        var changeStatus = false;
        if (self.data.entryInfo.status == "占坑中" || self.data.entryInfo.status == "报名中") {
          changeStatus = true;
        }

        for (var i = 0; i < self.data.members.length; i++) {
          if (changeStatus && self.data.members[i].entryInfo.status == "替补中") {
            self.data.members[i].entryInfo.status == "报名中"
            changeStatus = false // 自己退出，只能补上排在最前面的替补
          }
          //从members中删掉personid
          if (self.data.members[i].personid == app.globalData.personid) {
            self.data.members.splice(i, 1)
            i = i - 1
          }
        }

        // 云函数
        wx.cloud.callFunction({
          name: 'updateMember', // 云函数名称
          data: {
            outdoorid: self.data.outdoorid,
            members: self.data.members
          }
        }).then(res => {
          // 删除Persons表中的entriedOutdoors中的对应id的item
          self.updateEntriedOutdoors(true)

          // 退出后还可以继续再报名
          self.setData({
            "entryInfo.status": "浏览中",
            members: self.data.members,
          })
        })
      })

    // 退出信息也要同步到网站
    self.postEntry2Websites(true)
  },

  // 查看报名情况，同时可以截屏保存起来
  printOutdoor: function() {
    // 导航到 printOutdoor页面
    const self = this;
    var temp = "&isLeader=false";
    if (self.data.entryInfo.status == "领队") {
      temp = "&isLeader=true";
    }
    wx.navigateTo({
      url: "../PrintOutdoor/PrintOutdoor?outdoorid=" + self.data.outdoorid + temp
    })
  },

  clickMeets: function(e) {
    console.log(e)
    this.setData({
      "entryInfo.meetsIndex": parseInt(e.target.dataset.name),
    })
  },

  // 选择或改变集合地点选择
  changeMeets: function(e) {
    const self = this;
    self.setData({
      "entryInfo.meetsIndex": parseInt(e.detail),
    })
  },

  // 勾选同意免责条款
  checkDisclaimer: function(e) {
    const self = this;
    self.setData({
      "entryInfo.agreedDisclaimer": !self.data.entryInfo.agreedDisclaimer,
    })
  },

  // 勾选是否认路
  checkKnowWay: function(e) {
    const self = this;
    console.log(self.data.entryInfo.knowWay)
    self.setData({
      "entryInfo.knowWay": !self.data.entryInfo.knowWay,
    })
  },

  // 关注活动
  careOutdoor: function() {
    // 关注活动，就是往Persons表中做一下记录
    const self = this;
    if (!self.data.hasCared) {
      self.data.caredOutdoors.unshift({
        id: self.data.outdoorid,
        title: self.data.title.whole
      })
      dbPersons.doc(app.globalData.personid).update({
        data: {
          caredOutdoors: self.data.caredOutdoors
        }
      }).then(res => {
        self.setData({
          hasCared: true,
        })
      })
    }
  },

  //取消关注
  cancelCare: function() {
    const self = this;
    if (self.data.hasCared) {
      self.data.caredOutdoors.forEach((item, index) => {
        if (item.id == self.data.outdoorid) {
          self.data.caredOutdoors.splice(index, 1)
        }
      })
      dbPersons.doc(app.globalData.personid).update({
        data: {
          caredOutdoors: self.data.caredOutdoors
        }
      }).then(res => {
        self.setData({
          hasCared: false,
        })
      })
    }
  },

  // 回到首页
  toMainpage: function() {
    wx.switchTab({
      url: "../MyOutdoors/MyOutdoors",
    })
  },

})