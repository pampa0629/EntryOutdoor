const app = getApp()

wx.cloud.init()
const db = wx.cloud.database({})
const dbPersons = db.collection('Persons')

Page({

  data: {
    disclaimer: "", //免责条款
    isEnvironment: null, // 环保
    isKeepTime: null, // 守时
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

  copyDisclaimer() {
    const self = this
    wx.setClipboardData({
      data: self.data.disclaimer,
    })
  },

  saveMyDisclaimer: function() {
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