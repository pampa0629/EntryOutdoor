const app = getApp()
const util = require('../../utils/util.js')
const cloudfun = require('../../utils/cloudfun.js')
const template = require('../../utils/template.js')
const message = require('../../utils/message.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
 
Page({
 
  data: { 
    limits: {
      maxPerson: false, // 是否进行人数限制 
      personCount: 20, // 最多人数，默认20（中巴车）
      allowPopup: false, // 是否允许空降。当限制人数时，则肯定不能空降
      occppy: {
        date: "不限",
        time: null
      }, // 占坑截止时间
      entry: {
        date: "不限",
        time: null
      }, // 报名截止时间
      isEnvironment: true, // 环保
      isKeepTime: true, // 守时
      isAA:true, // 费用AA
      intoHall: true, // 活动是否进入活动大厅
      isTest: false, // 是否为测试发帖
      private: false, // 是否为私约活动
    },
    hasModified: false,

    // 人数扩容或缩编导致需要即时变化的情况
    // outdoorid: null,
    od:null,
    // title: null,
    // members: null, // 当前已报名队员
    // addMembers: null, // 附加队员
    //newPersonCount:null, // 变化后的人数
    oldPersonCount: null,

    lvyeorgInfo:null, // 绿野org信息

    size: app.globalData.setting.size, // 界面大小
  },

  onShow() {
    this.setData({
      size: app.globalData.setting.size
    })
  },

  onLoad: function(options) {
    const self = this;

    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    let od = prevPage.data.od
    self.setData({
      od:od,
      // outdoorid: od.outdoorid,
      // title: od.title.whole,
      limits: od.limits,
      // members: od.members, // 当前已报名队员
      // addMembers: od.addMembers, // 附加队员
      oldPersonCount: od.limits.personCount ? od.limits.personCount : 0,
    })
    console.log(self.data)

    // 兼容性处理
    if (!self.data.limits || self.data.limits.maxPerson == undefined) {
      self.setData({
        "limits.maxPerson": false,
        hasModified: true,
      })
    }
    if (!self.data.limits) {
      self.setData({
        isEnvironment: true, // 环保
        isKeepTime: true, // 守时
        hasModified: true,
      })
    }
    if (!self.data.limits || self.data.limits.intoHall == undefined) {
      self.setData({
        intoHall: true,
        hasModified: true,
      })
    }

    // 绿野org
    if (app.globalData.lvyeorgLogin) {
      self.setData({
        lvyeorgInfo: app.globalData.lvyeorgInfo
      })
    }
  },

  save(e) {
    console.log("EditLimits save()")
    console.log("this.data.hasModified：" + this.data.hasModified)
    if (e)
      template.savePersonFormid(app.globalData.personid, e.detail.formId, null)

    if (this.data.hasModified) {
      const self = this;
      console.log(self.data)
      let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
      let prevPage = pages[pages.length - 2];
      prevPage.setData({
        "od.limits": self.data.limits,
      })
      this.data.od.saveItem("limits")
      this.setData({
        hasModified: false,
      })
    }
  },

  onUnload: function() {
    console.log("onUnload()")
    this.save() // 自动保存
  },

  giveup(e) {
    console.log("giveup()")
    template.savePersonFormid(app.globalData.personid, e.detail.formId, null)
    this.data.hasModified = false
    wx.navigateBack({})
  },

  // 勾选是否进行人数限制
  checkMaxPerson: function(e) {
    console.log(e)
    const self = this;
    console.log(self.data.limits.maxPerson)
    self.setData({
      "limits.maxPerson": !self.data.limits.maxPerson,
      hasModified: true
    })
    if (self.data.limits.maxPerson && !self.data.limits.personCount) {
      self.setData({
        "limits.personCount": 20, // 限制人数，默认为20人（中巴车）
      })
    }
    if (self.data.limits.maxPerson) { // 如果设置了最大人数限制，则肯定不能空降了
      self.setData({
        "limits.allowPopup": false,
      })
    }
  },

  // 调整人数限制
  bindAddPerson: function(e) {
    this.setData({
      "limits.personCount": e.detail,
      hasModified: true
    })
  },

  // 扩编：允许人数增加，且已经有替补队员时--> 把对应的替补队员改为正式队员，并发微信通知
  tapEnlarge() {
    const self = this
    dbOutdoors.doc(self.data.od.outdoorid).get().then(res => {
      const members = res.data.members
      var begin = self.data.oldPersonCount - self.data.od.addMembers.length // 起点index
      begin = Math.max(0, begin) // 不能比0小
      var end = Math.min(members.length, self.data.limits.personCount - self.data.od.addMembers.length)
      for (var i = begin; i < end; i++) {
        if (members[i].entryInfo.status == "替补中") {
          members[i].entryInfo.status = "报名中"
          // 模板消息
          template.sendEntryMsg2Bench(members[i].personid, self.data.od.outdoorid, self.data.od.title.whole, members[i].userInfo.nickName)
          // 订阅消息
          message.sendEntryStatusChange(members[i].personid, self.data.od.outdoorid, self.data.od.title.whole, "因领队扩编，您从“替补中”转为“报名中”")
          // 记录操作
          odtools.recordOperation(self.data.od.outdoorid, "扩编为报名中", members[i].userInfo.nickName)
        }
      }
      self.afterAdjust(members)
    })
  },

  // 缩编：允许人数减少，且需要把队员转为替补时-- >把对应的正式队员改为替补队员，并发微信通知
  tapReduce() {
    const self = this
    dbOutdoors.doc(self.data.od.outdoorid).get().then(res => {
      const members = res.data.members
      var begin = self.data.limits.personCount - self.data.od.addMembers.length // 起点index
      begin = Math.max(0, begin) // 不能比0小
      var end = Math.min(members.length, self.data.oldPersonCount - self.data.od.addMembers.length)
      for (var i = begin; i < end; i++) {
        if (members[i].entryInfo.status != "替补中") {
          // 模板消息
          template.sendBenchMsg2Member(members[i].personid, self.data.od.outdoorid, self.data.od.title.whole, members[i].entryInfo.status, members[i].userInfo.nickName)
          // 订阅消息
          message.sendEntryStatusChange(members[i].personid, self.data.od.outdoorid, self.data.od.title.whole, "因领队缩编队伍，您被转为替补")
          members[i].entryInfo.status = "替补中" 
          // 记录操作
          odtools.recordOperation(self.data.od.outdoorid, "缩编为替补", members[i].userInfo.nickName)
        }
      }
      self.afterAdjust(members)
    })
  },

  // 扩编或者缩编后的共同事务
  afterAdjust(members) {
    this.setData({
      oldPersonCount: this.data.limits.personCount, // 把人数限制的变化保存起来 
      // members: members,
    }) 

    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    prevPage.setData({
      "od.members": members,
    })
    this.data.od.saveItem("members")
  },

  // 勾选是否允许空降
  checkAllowPopup: function(e) {
    console.log(e)
    console.log(this.data.limits.allowPopup)
    this.setData({
      "limits.allowPopup": !this.data.limits.allowPopup,
      hasModified: true
    })
  },

  // 勾选是否要求环保
  checkEnvironment: function(e) {
    console.log(e)
    console.log(this.data.limits.isEnvironment)
    this.setData({
      "limits.isEnvironment": !this.data.limits.isEnvironment,
      hasModified: true
    })
  },

  // 是否进入活动大厅
  checkIntoHall: function(e) {
    console.log(e)
    console.log(this.data.limits.intoHall)
    this.setData({
      "limits.intoHall": true,
      "limits.isTest":false,
      "limits.private":false,
      hasModified: true
    })
  },

  // 是否为测试发帖
  checkTest: function(e) {
    console.log(e)
    console.log(this.data.limits.isTest)
    this.setData({
      "limits.isTest": true,
      "limits.intoHall": false,
      "limits.private": false,
      hasModified: true
    })
  },

  // 是否为私约活动
  checkPrivate: function(e) {
    console.log(e)
    console.log(this.data.limits.private)
    this.setData({
      "limits.private": true,
      "limits.intoHall": false,
      "limits.isTest": false,
      hasModified: true
    })
  },

  // 勾选是否要求守时
  checkKeepTime: function(e) {
    console.log(e)
    const self = this;
    console.log(self.data.limits.isKeepTime)
    self.setData({
      "limits.isKeepTime": !self.data.limits.isKeepTime,
      hasModified: true
    })
  },

  // 勾选是否要求费用AA
  checkAA: function (e) {
    console.log(e)
    const self = this;
    console.log(self.data.limits.isAA)
    self.setData({
      "limits.isAA": !self.data.limits.isAA,
      hasModified: true
    })
  },


})