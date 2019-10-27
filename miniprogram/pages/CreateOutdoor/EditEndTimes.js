const app = getApp()
const template = require('../../utils/template.js')
const util = require('../../utils/util.js')

Page({

  data: {
    OcuppyDates: null, // 占坑截止日期
    EntryDates: null, // 报名截止日期 

    ocuppy: null, // 占坑截止时间
    entry: null, // 报名截止时间
    hasModified: false,

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
    self.setData({
      ocuppy: prevPage.data.limits.ocuppy,
      entry: prevPage.data.limits.entry,
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

  save: function(e) {
    console.log("EditEndTimes.js save()")
    if (e)
      template.savePersonFormid(app.globalData.personid, e.detail.formId, null)
    
    if (this.data.hasModified) {
      const self = this;
      console.log(self.data)
      let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
      let prevPage = pages[pages.length - 2];
      let od = pages[pages.length - 3].data.od
      prevPage.setData({ // 这样设置，od同样也能被修改掉
        "limits.ocuppy": self.data.ocuppy,
        "limits.entry": self.data.entry,
      })
      od.saveItem("limits.ocuppy")
      od.saveItem("limits.entry")
      this.setData({
        hasModified: false
      })
    }
  },

  onUnload: function() {
    console.log("onUnload()")
    this.save() // 自动保存
  },

  giveup(e) {
    template.savePersonFormid(app.globalData.personid, e.detail.formId, null)
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

})