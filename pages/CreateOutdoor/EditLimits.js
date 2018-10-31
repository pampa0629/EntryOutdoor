// pages/CreateOutdoor/EditLimits.js
Page({

  data: {
    OcuppyDates: ["不限", "前一天", "前两天", "前三天", "前四天", "前五天","前六天"], // 占坑截止日期
    EntryDates: ["不限", "前一天", "前两天", "前三天", "前四天", "前五天", "前六天"], // 报名截止日期

    limits: { 
      maxPerson:false, // 是否进行人数限制
      personCount:25, // 最多的人数
      occppy:{date:"不限", time:null}, // 占坑截止时间
      entry: { date: "不限", time: null }, // 报名截止时间
      },
    hasModified: false,
  },

  onLoad: function (options) {
    const self = this;
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    self.setData({
      limits: prevPage.data.limits,
      hasModified: prevPage.data.hasModified,
    })
    console.log(self.data.limits)

    // 兼容性处理
    if (!self.data.limits || !self.data.limits.maxPerson){
      self.setData({ 
        "limits.maxPerson": false,
        hasModified: true
      })
      if (self.data.limits.maxPerson && !self.data.limits.personCount) {
        self.setData({
          "limits.personCount": 25,
        })
      }
    }
  },

  onUnload: function () {
    const self = this;
    console.log(self.data.limits)
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    prevPage.setData({
      limits: self.data.limits,
      hasModified: self.data.hasModified,
    })
  },

  // 勾选是否进行人数限制
  checkMaxPerson: function (e) {
    console.log(e)
    const self = this;
    console.log(self.data.limits.maxPerson)
    self.setData({
      "limits.maxPerson": !self.data.limits.maxPerson,
    })
  },

  // 调整人数限制
  bindAddPerson: function(e) {
    this.setData({
      "limits.personCount": e.detail,
      hasModified: true
    })
  },

  // 占坑截止日期
  changOcuppyDate: function (e) {
    console.log(e)
    const self = this;
    self.setData({
      "limits.ocuppy.date": self.data.OcuppyDates[e.detail.value],
      hasModified: true,
    })
  },

  // 占坑截止时间
  changOcuppyTime: function (e) {
    console.log(e)
    this.setData({
      "limits.ocuppy.time": e.detail.value,
      hasModified: true,
    })
  },

  // 报名截止日期
  changEntryDate: function (e) {
    console.log(e)
    const self = this;
    self.setData({
      "limits.entry.date": self.data.EntryDates[e.detail.value],
      hasModified: true,
    })
  },

  // 报名截止时间
  changEntryTime: function (e) {
    console.log(e)
    this.setData({
      "limits.entry.time": e.detail.value,
      hasModified: true,
    })
  },

})