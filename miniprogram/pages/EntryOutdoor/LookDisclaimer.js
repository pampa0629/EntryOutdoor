const app = getApp()
const template = require('../../utils/template.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbPersons = db.collection('Persons')

Page({

  data: {
    disclaimer: "", //免责条款
    isEnvironment: null, // 环保
    isKeepTime: null, // 守时
  },

  onLoad: function(options) {
    const self = this;
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    console.log(prevPage.data.od.limits)
    if (prevPage.data.od.limits.disclaimer) {
      self.setData({
        disclaimer: prevPage.data.od.limits.disclaimer,
      })
    }
    if (prevPage.data.od.limits.isEnvironment) {
      self.setData({
        isEnvironment: prevPage.data.od.limits.isEnvironment,
      })
    }
    if (prevPage.data.od.limits.isKeepTime) {
      self.setData({
        isKeepTime: prevPage.data.od.limits.isKeepTime,
      })
    }
  },

  copyDisclaimer: function(e) {
    template.savePersonFormid(app.globalData.personid, e.detail.formId)
    const self = this
    wx.setClipboardData({
      data: self.data.disclaimer,
    })
  },

  saveMyDisclaimer: function(e) {
    template.savePersonFormid(app.globalData.personid, e.detail.formId)
    const self = this
    if (app.checkLogin()) {
      dbPersons.doc(app.globalData.personid).update({
        data: {
          disclaimer: self.data.disclaimer,
        }
      })
    }
  },

})