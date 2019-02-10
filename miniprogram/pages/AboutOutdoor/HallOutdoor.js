const app = getApp()
const util = require('../../utils/util.js')
const outdoor = require('../../utils/outdoor.js')
const template = require('../../utils/template.js')
const cloudfun = require('../../utils/cloudfun.js')
const lvyeorg = require('../../utils/lvyeorg.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
const dbPersons = db.collection('Persons')
const _ = db.command

Page({

  data: {
    outdoors: [],
  },

  onLoad: function(options) {
    this.flushOutdoors(null)
    wx.showShareMenu({
      withShareTicket: true
    })
  },

  flushOutdoors(callback) {
    const self = this
    self.data.outdoors = []
    var today = util.formatDate(new Date())
    dbOutdoors.orderBy("title.date", 'asc')
      .where({"title.date": _.gte(today)})
      .where({ "limits.intoHall": _.neq(false)})
      .get().then(res => {
      console.log(res)
      res.data.forEach((item, index) => {
        console.log(item)
        var outdoor = {
          title: item.title.whole,
          id: item._id,
          pic: (item.brief.pics && item.brief.pics.length > 0) ? item.brief.pics[0].src : null,
          openid: item._openid,
          status:item.status,
        }
        console.log(outdoor)
        self.data.outdoors.push(outdoor)
      })
      self.setData({
        outdoors: self.data.outdoors
      })
      self.buildFunction()
      if (callback) {
        callback()
      }
    })
  },

  buildFunction(){
    const self = this
    for(var i=0;i<self.data.outdoors.length; i++) {
      let index = i; // 还必须用let才行
      this["intoOutdoor" + index] = (e) => {
        self.intoOutdoor(index, e)
      }
    }
  },

  intoOutdoor(index, e){
    console.log(e)
    const self = this
    const outdoor = self.data.outdoors[index]
    if (outdoor.openid == app.globalData.openid) {
      // 自己创建的活动，进入编辑
      util.saveOutdoorID(outdoor.id)
      wx.switchTab({
        url: '../CreateOutdoor/CreateOutdoor',
      })
    } else {
      // 别人的活动，进入报名页面
      wx.navigateTo({
        url: '../EntryOutdoor/EntryOutdoor?outdoorid=' + outdoor.id,
      })
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {

  },

  onUnload: function() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function() {
    wx.showNavigationBarLoading()
    this.flushOutdoors(res=>{
      wx.hideNavigationBarLoading();
      wx.stopPullDownRefresh();
    })
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function() {
    return {
      title: 活动大厅,
      path: 'pages/AboutOutdoor/HallOutdoor',
    }
  }
})