const util = require('../../utils/util.js')

Page({

  data: {
    limits: { 
      maxPerson:false, // 是否进行人数限制
      personCount:20, // 最多人数，默认20（中巴车）
      allowPopup:false, // 是否允许空降。当限制人数时，则肯定不能空降
      occppy:{date:"不限", time:null}, // 占坑截止时间
      entry: { date: "不限", time: null }, // 报名截止时间
      },
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
      limits: prevPage.data.limits,
      hasModified: prevPage.data.hasModified,
    })
    console.log(self.data)

    // 兼容性处理
    if (!self.data.limits || !self.data.limits.maxPerson){
      self.setData({ 
        "limits.maxPerson": false,
        // hasModified: true
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
    })
    if (self.data.limits.maxPerson && !self.data.limits.personCount) {
      self.setData({
        "limits.personCount": 25, // 限制人数，默认为25人（中巴车）
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

  // 勾选是否允许空降
  checkAllowPopup: function (e) {
    console.log(e)
    const self = this;
    console.log(self.data.limits.allowPopup)
    self.setData({
      "limits.allowPopup": !self.data.limits.allowPopup,
    })
  },


})