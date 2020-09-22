const app = getApp()
const outdoor = require('../../utils/outdoor.js')
const odtools = require('../../utils/odtools.js')

Page({

  data: {
    members: null,
    addMembers: null,
    size: app.globalData.setting.size, // 界面大小
    outdoorid:"", // 活动id
    isChild:false,
    unit:"人",
  },

  onShow() {
    this.setData({
      size: app.globalData.setting.size
    })
  },

  onLoad: function (options) {
    console.log("LookMembers.onLoad()", options)
    const self = this;
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    this.data.outdoorid = prevPage.data.od.outdoorid
    this.flushMembers(prevPage.data.od.members, prevPage.data.od.addMembers)
    if(prevPage.data.od.title.loaded == "绿野童军") {
      this.setData({
        isChild:true,
        unit:"家"
      })
    }
  },

  flushMembers(members, addMembers) {
    const self = this
    
    // 把认路与否的转化为文本
    members.forEach((item, index) => {
      if (item.entryInfo.knowWay == undefined || item.entryInfo.knowWay == true) {
        item.entryInfo.knowWay = "认路" // undefined 为没有设置，一般为领队，默认认路
      } else {
        item.entryInfo.knowWay = "不认路"
      }
      item.entryInfo.meetsIndex = parseInt(item.entryInfo.meetsIndex)
      item.childInfo = odtools.buildChildInfo(item, null)
    })

    self.setData({
      members: members,
      addMembers: addMembers,
    })
  },

  // 页面相关事件处理函数--监听用户下拉动作  
  async onPullDownRefresh() {
    console.log("onPullDownRefresh()")
    wx.showNavigationBarLoading()
    // 刷新队员信息
    var od2 = new outdoor.OD()
    await od2.load(this.data.outdoorid)
    this.flushMembers(od2.members, od2.addMembers)
    
    wx.hideNavigationBarLoading()
    wx.stopPullDownRefresh()
  },

})