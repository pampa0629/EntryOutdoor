const util = require('../../utils/util.js')

Page({

  data: {
    OcuppyDates: null, // 占坑截止日期
    EntryDates: null, // 报名截止日期 

    ocuppy: null, // 占坑截止时间
    entry: null, // 报名截止时间
    hasModified: false, 
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
      ocuppy: prevPage.data.limits.ocuppy,
      entry: prevPage.data.limits.entry,
      hasModified: prevPage.data.hasModified,
    })

    if(!self.data.ocuppy) {
      self.setData({
        // 默认占坑截止时间
        ocuppy: { date: "前两天", time: "22:00" },
        hasModified: true, 
      })
    }

    if (!self.data.entry) {
      self.setData({
        // 默认报名截止时间
        entry: { date: "前一天", time: "22:00" },
        hasModified: true, 
      })
    }

    console.log(self.data)
  },

  onUnload: function () {
    const self = this;
    console.log(self.data)
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    prevPage.setData({
      "limits.ocuppy": self.data.ocuppy,
      "limits.entry": self.data.entry,
      hasModified: self.data.hasModified,
    })
  },

  // 占坑截止日期
  changOcuppyDate: function (e) {
    console.log(e)
    const self = this;
    self.setData({
      "ocuppy.date": self.data.OcuppyDates[e.detail.value],
      hasModified: true,
    })
  },

  // 占坑截止时间
  changOcuppyTime: function (e) {
    console.log(e)
    this.setData({
      "ocuppy.time": e.detail.value,
      hasModified: true,
    })
  },

  // 报名截止日期
  changEntryDate: function (e) {
    console.log(e)
    const self = this;
    self.setData({
      "entry.date": self.data.EntryDates[e.detail.value],
      hasModified: true,
    })
  },

  // 报名截止时间
  changEntryTime: function (e) {
    console.log(e)
    this.setData({
      "entry.time": e.detail.value,
      hasModified: true,
    })
  },

})