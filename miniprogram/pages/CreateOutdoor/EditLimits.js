const util = require('../../utils/util.js')
const cloudfun = require('../../utils/cloudfun.js')
const template = require('../../utils/template.js')

Page({

  data: {
    limits: { 
      maxPerson:false, // 是否进行人数限制 
      personCount:20, // 最多人数，默认20（中巴车）
      allowPopup:false, // 是否允许空降。当限制人数时，则肯定不能空降
      occppy:{date:"不限", time:null}, // 占坑截止时间
      entry: { date: "不限", time: null }, // 报名截止时间
      isEnvironment:true, // 环保
      isKeepTime: true, // 守时
      },
    hasModified: false,

    // 人数扩容或缩编导致需要即时变化的情况
    outdoorid:null, 
    title:null,
    members:null, // 当前已报名队员
    //newPersonCount:null, // 变化后的人数
    oldPersonCount:null, 
  },

  onLoad: function (options) {
    const self = this;
    self.setData({
      OcuppyDates: util.getLimitDates(),
      EntryDates: util.getLimitDates(),
    })

    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    self.setData({
      outdoorid: prevPage.data.outdoorid, 
      title: prevPage.data.title.whole,
      limits: prevPage.data.limits,
      members: prevPage.data.members, // 当前已报名队员
      oldPersonCount: prevPage.data.limits.personCount, 
      hasModified: prevPage.data.hasModified,
    })
    console.log(self.data)

    // 兼容性处理
    if (!self.data.limits || !self.data.limits.maxPerson){
      self.setData({ 
        "limits.maxPerson": false,
      })
    }
    if (!self.data.limits) {
      self.setData({
        isEnvironment: true, // 环保
        isKeepTime: true, // 守时
      })
    }
  },

  onUnload: function () {
    const self = this;
    console.log(self.data)
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    prevPage.setData({
      limits: self.data.limits,
      hasModified: self.data.hasModified,
      "modifys.limits": self.data.hasModified,
    })
  },

  // 勾选是否进行人数限制
  checkMaxPerson: function (e) {
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
    if (self.data.limits.maxPerson){ // 如果设置了最大人数限制，则肯定不能空降了
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
    const members = self.data.members
    var begin = self.data.oldPersonCount // 起点index
    var end = Math.min(members.length, self.data.limits.personCount)
    for (var i = begin; i < end; i++) {
      members[i].entryInfo.status = "报名中"
      template.sendEntryMsg2Bench(members[i].personid, self.data.outdoorid, self.data.title, members[i].userInfo.nickName)
    }
    cloudfun.updateOutdoorMembers(self.data.outdoorid, members, res=>{
      self.savePersonCount()
    })
  },

  // 缩编：允许人数减少，且需要把队员转为替补时-- >把对应的正式队员改为替补队员，并发微信通知
  tapReduce() {
    const self = this
    const members = self.data.members
    var begin = self.data.limits.personCount // 起点index
    var end = Math.min(members.length, self.data.oldPersonCount)
    for (var i = begin; i < end; i++) {
      template.sendBenchMsg2Member(members[i].personid, self.data.outdoorid, self.data.title, members[i].entryInfo.status, members[i].userInfo.nickName)
      members[i].entryInfo.status = "替补中"
    }
    cloudfun.updateOutdoorMembers(self.data.outdoorid, self.data.members, res => {
      self.savePersonCount()
    })
  },

  // 把人数限制的变化保存起来 
  savePersonCount(){
    const self = this
    self.setData({
      oldPersonCount: self.data.limits.personCount,
    })
  },

  // 勾选是否允许空降
  checkAllowPopup: function (e) {
    console.log(e)
    const self = this;
    console.log(self.data.limits.allowPopup)
    self.setData({
      "limits.allowPopup": !self.data.limits.allowPopup,
      hasModified: true
    })
  },

  // 勾选是否要求环保
  checkEnvironment: function (e) {
    console.log(e)
    const self = this;
    console.log(self.data.limits.isEnvironment)
    self.setData({
      "limits.isEnvironment": !self.data.limits.isEnvironment,
      hasModified: true
    })
  },

  // 勾选是否要求守时
  checkKeepTime: function (e) {
    console.log(e)
    const self = this;
    console.log(self.data.limits.isKeepTime)
    self.setData({
      "limits.isKeepTime": !self.data.limits.isKeepTime,
      hasModified: true
    })
  },


})