const app = getApp()

const db = wx.cloud.database({})
const dbPersons = db.collection('Persons')
const _ = db.command

Page({

  data: {
    career:{
      evaluation:null,
      topn: [{}, {}, {}],
      other:"",
    },
  }, 

  onLoad: function (options) {
    const self = this
    // 读取数据库
    dbPersons.doc(app.globalData.personid).get().then(res => {
      if (res.data.career) {
        self.setData({
          career: res.data.career
        })
      }
      if (!self.data.career.topn) {
        self.setData({
          "career.topn": [{}, {}, {}]
        })
      }
    })
  },

  onUnload: function () {
    const self = this
    dbPersons.doc(app.globalData.personid).update({
      data: {
        career: self.data.career
      }
    })
  },

  inOther() {
    const self = this
    wx.getClipboardData({
      success: function (res) {
        console.log(res.data)
        self.setData({
          "career.other": res.data,
        })
      }
    })
  },

  outOther() {
    const self = this
    wx.setClipboardData({
      data: self.data.career.other,
    })
   },

})