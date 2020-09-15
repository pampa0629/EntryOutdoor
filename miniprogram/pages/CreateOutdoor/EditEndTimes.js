const app = getApp()
const util = require('../../utils/util.js')

Page({

  data: {
    OcuppyDates: null, // 占坑截止日期
    EntryDates: null, // 报名截止日期 

    ocuppy: null, // 占坑截止时间
    entry: null, // 报名截止时间
    autoConfirm: null, // 自动成行
    hasModified: false,

    od:null, // 活动所有内容
    size: app.globalData.setting.size, // 界面大小
  },

  onLoad: function(options) {
    const self = this;
    self.setData({
      OcuppyDates: util.getLimitDates(),
      EntryDates: util.getLimitDates(),
    })

    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    let prevprevPage = pages[pages.length - 3];
    self.setData({
      ocuppy: prevPage.data.limits.ocuppy,
      entry: prevPage.data.limits.entry,
      autoConfirm: prevPage.data.limits.autoConfirm,
      od: prevprevPage.data.od,
    })

    if (!self.data.ocuppy) {
      self.setData({
        // 默认占坑截止时间
        ocuppy: {
          date: "前两天",
          time: "22:00"
        },
        hasModified: true,
      })
    }

    if (!self.data.entry) {
      self.setData({
        // 默认报名截止时间
        entry: {
          date: "前一天",
          time: "22:00"
        },
        hasModified: true,
      })
    }

    console.log(self.data)
  },

  onShow() {
    this.setData({
      size: app.globalData.setting.size
    })
  },

  save() {
    console.log("EditEndTimes.save()")
    
    if (this.data.hasModified) {
      const self = this;
      console.log(self.data)
      let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
      let prevPage = pages[pages.length - 2];
      let od = pages[pages.length - 3].data.od
      prevPage.setData({ // 这样设置，od同样也能被修改掉
        "limits.ocuppy": self.data.ocuppy,
        "limits.entry": self.data.entry,
        "limits.autoConfirm": self.data.autoConfirm,
      })
      od.saveItem("limits.ocuppy")
      od.saveItem("limits.entry")
      od.saveItem("limits.autoConfirm")
      this.setData({
        hasModified: false
      })
    }
  },

  onUnload: function() {
    console.log("onUnload()")
    this.save() // 自动保存
  },

  giveup() {
    this.data.hasModified = false
    wx.navigateBack({})
  },

  // 占坑截止日期
  changOcuppyDate: function(e) {
    console.log(e)
    const self = this;
    self.setData({
      "ocuppy.date": self.data.OcuppyDates[e.detail.value],
      hasModified: true,
    })
  },

  // 占坑截止时间
  changOcuppyTime: function(e) {
    console.log(e)
    this.setData({
      "ocuppy.time": e.detail.value,
      hasModified: true,
    }) 
  },

  // 报名截止日期
  changEntryDate: function(e) {
    console.log(e)
    const self = this;
    self.setData({
      "entry.date": self.data.EntryDates[e.detail.value],
      hasModified: true,
    })
  },

  // 报名截止时间
  changEntryTime: function(e) {
    console.log(e)
    this.setData({
      "entry.time": e.detail.value,
      hasModified: true,
    })
  },

  // 开启自动成行；若首次开启，设置默认条件
  openAutoConfirm(e) {
    console.log(e)
    
    if (!this.data.autoConfirm) { 
      var defaultCount = 3 // 默认三人成行
      if (this.data.od.limits.maxPerson) {
        // 如果为null，即之前没有设置过，则设置为活动总限制人数的80%
        defaultCount = parseInt(this.data.od.limits.personCount * 0.8)
      }
      this.setData({
        "autoConfirm.personCount": defaultCount,
        "autoConfirm.date": this.data.entry.date,
        "autoConfirm.time": this.data.entry.time,
      })  
    }

    this.setData({
      "autoConfirm.enabled": e.detail,
      hasModified: true,
    })
  },

  // 自动成行：调整人数
  bindAddPerson(e) {
    this.setData({
      "autoConfirm.personCount": e.detail,
      hasModified: true
    })
  },

  // 报名截止日期
  changAutoConfirmDate: function (e) {
    console.log(e)
    const self = this;
    self.setData({
      "autoConfirm.date": self.data.EntryDates[e.detail.value],
      hasModified: true,
    })
  },

  // 报名截止时间
  changAutoConfirmTime: function (e) {
    console.log(e)
    this.setData({
      "autoConfirm.time": e.detail.value,
      hasModified: true,
    })
  },

})