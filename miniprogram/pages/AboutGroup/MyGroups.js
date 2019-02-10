const app = getApp()
const util = require('../../utils/util.js')
const person = require('../../utils/person.js')
const cloudfun = require('../../utils/cloudfun.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbPersons = db.collection('Persons')

Page({

  data: {
    groups:{}
  },

  onLoad: function (options) {
    const self = this
    dbPersons.doc(app.globalData.personid).get().then(res=>{
      if (res.data.groups) {
        self.setData({
          groups:res.data.groups,
        })
        console.log(self.data.groups)
        for (var i = 0; i < self.data.groups.length; i++) {
          let index = i; // 还必须用let才行
          this["tapGroup" + index] = (e) => {
            self.tapGroup(index, e)
          }
          this["quitGroup" + index] = (e) => {
            self.quitGroup(index, e)
          }
        }
      }
    })
  },

  tapGroup(index, e) {
    const self = this
    wx.navigateTo({
      url: './OneGroup?groupOpenid='+self.data.groups[index].openid,
    })
  },

  // 退出群
  quitGroup(index, e) {
    const self = this
    self.data.groups.splice(index, 1)
    self.setData({
      groups: self.data.groups
    })
    cloudfun.updatePersonGroups(app.globalData.personid, self.data.groups)
  },

  onShow: function () {

  },

  onUnload: function () {

  },
})