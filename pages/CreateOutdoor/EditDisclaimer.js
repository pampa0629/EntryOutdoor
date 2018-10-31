const app = getApp()
wx.cloud.init()
const db = wx.cloud.database({})
const dbPersons = db.collection('Persons')

Page({

  data: {
    disclaimer: "", //免责条款
    hasModified:false,
  },

  onLoad: function (options) {
    const self = this;
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    self.setData({
      disclaimer: prevPage.data.limits.disclaimer,
      hasModified: prevPage.data.hasModified,
    })
  },

  onUnload: function () {
    const self = this;
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    prevPage.setData({
      "limits.disclaimer": self.data.disclaimer,
      hasModified: self.data.hasModified,
    })
  },

  pasteDisclaimer: function () {
    const self = this
    wx.getClipboardData({
      success: function (res) {
        console.log(res.data)
        self.setData({
          disclaimer: res.data,
          hasModified:true,
        })
      }
    })
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