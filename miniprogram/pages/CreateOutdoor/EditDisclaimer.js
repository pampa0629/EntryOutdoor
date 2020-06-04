const app = getApp()
wx.cloud.init()
const db = wx.cloud.database({})
const dbPersons = db.collection('Persons')

Page({

  data: {
    disclaimer: "", //免责条款
    hasModified: false,
    od:null, 
  },

  onLoad: function(options) {
    const self = this;
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    self.setData({
      disclaimer: prevPage.data.od.limits.disclaimer,
      od: prevPage.data.od,
    }) 
  },

  onShow() {
    this.setData({
      size: app.globalData.setting.size
    })
  },

  save() {
    console.log("save()")
    if (this.data.hasModified) { 
      const self = this;
      let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
      let prevPage = pages[pages.length - 2];
      prevPage.setData({
        "od.limits.disclaimer": self.data.disclaimer,
      })
      prevPage.data.od.saveItem("limits.disclaimer")
      this.setData({
        hasModified: false,
      })
    }
  },

  onUnload: function() {
    console.log("onUnload()")
    this.save() // 自动保存
  },

  giveup() {
    console.log("giveup()")
    this.data.hasModified = false
    wx.navigateBack({})
  },

  pasteDisclaimer: function() {
    const self = this
    wx.getClipboardData({
      success: function(res) {
        console.log(res.data)
        self.setData({
          disclaimer: res.data,
          hasModified: true,
        })
      }
    })
  },

  copyDisclaimer: function() {
    const self = this
    wx.setClipboardData({
      data: self.data.disclaimer,
    })
  },

  loadMyDisclaimer: function() {
    const self = this;
    dbPersons.doc(app.globalData.personid).get()
      .then(res => {
        self.setData({
          disclaimer: res.data.disclaimer,
          hasModified: true,
        })
      })
  },

  saveMyDisclaimer: function() {
    const self = this;
    dbPersons.doc(app.globalData.personid).update({
      data: {
        disclaimer: self.data.disclaimer,
      }
    })
  },

})