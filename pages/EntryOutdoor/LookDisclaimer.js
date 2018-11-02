const app = getApp()
wx.cloud.init()
const db = wx.cloud.database({})
const dbPersons = db.collection('Persons')

Page({

  data: {
    disclaimer: "", //免责条款
  },

  onLoad: function(options) {
    const self = this;
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    console.log(prevPage.data.limits)
    console.log(prevPage.data.limits.disclaimer)
    if (prevPage.data.limits.disclaimer) {
      self.setData({
        disclaimer: prevPage.data.limits.disclaimer,
      })
    }
  },

  copyDisclaimer: function () {
    const self = this
    wx.setClipboardData({
      data: self.data.disclaimer,
    })
  },

  saveMyDisclaimer: function () {
    const self = this;
    dbPersons.doc(app.globalData.personid).update({
      data: {
        disclaimer: self.data.disclaimer,
      }
    })
  },

})