const app = getApp()
const util = require('../../utils/util.js')
const cloudfun = require('../../utils/cloudfun.js')
const person = require('../../utils/person.js')

const db = wx.cloud.database({})
const dbPersons = db.collection('Persons')
const _ = db.command

Page({

  data: {
    career:{
      evaluation:null,
      step:{autoUpdate:true}, // 步数，是否自动更新
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

  clickFetchWalk() {
    const self = this
    person.updateWalkStep(app.globalData.personid, step=>{
      step.autoUpdate = self.data.career.step.autoUpdate
      self.setData({
        "career.step": step,
      })
    })
  },

  changeAutoUpdate(e){
    console.log(e)
    this.setData({
      "career.step.autoUpdate":e.detail,
    })
    console.log(this.data.career.step.autoUpdate)
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