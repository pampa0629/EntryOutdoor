const app = getApp()
const util = require('../../utils/util.js')
// const template = require('../../utils/template.js')
const message = require('../../utils/message.js')
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
    setting: {},
    Setting: "HallSetting", // key 
    page: {},
    size: app.globalData.setting.size, // 界面大小
  },

  onLoad: function(options) {
    console.log("HallOutdoow.onLoad()", options)
    const self = this
    var setting = wx.getStorageSync(self.data.Setting)
    if (setting) {
      self.setData({
        setting: setting,
      })
    }

    this.flushOutdoors(true, null)
    wx.showShareMenu({
      withShareTicket: true
    })
  },

  onShow() {
    this.setData({
      size: app.globalData.setting.size
    })
  },

  // isClear:是否清空之前结果重新查询
  flushOutdoors(isClear, callback) {
    const self = this
    if (isClear) {
      self.setData({
        page: {
          bottom: false,
          no: 0,
          limit: 10
        },
        outdoors: [],
      })
    }
    var today = util.formatDate(new Date())
    var query = dbOutdoors.where({
      "limits.intoHall": _.eq(true)
    })
    const setting = self.data.setting
    console.log(setting)
    if (!setting.showOutdate) { // 是否显示过期活动
      query = query.where({
        "title.date": _.gte(today)
      })
    }
    if (setting.keyword) { // 关键字搜索
      query = query.where({
        "title.place": db.RegExp({
          regexp: setting.keyword,
          options: 'i'
        })
      })
    }
    // 不能是拟定中的活动
    query = query.where({
      "status": _.neq("拟定中")
    })
    // 不能是已取消的活动
    query = query.where({
      "status": _.neq("已取消")
    })
    // 按日期排序，都优先看近期的活动；不显示过期活动时，日期从小到大（升序）；显示过期活动时，降序
    if (!setting.showOutdate) {
      query = query.orderBy("title.date", 'asc')
    } else {
      query = query.orderBy("title.date", 'desc')
    }

    // 分页
    const page = self.data.page
    console.log("page:", page)
    query = query.skip(page.no * page.limit).limit(page.limit)
    // 真正读取数据
    query.get().then(res => {
      console.log(res)
      self.setData({ // 到底部了
        "page.bottom": res.data.length == 0 ? true : false,
      })

      res.data.forEach((item, index) => {
        console.log(item)
        item.addMembers = item.addMembers ? item.addMembers : []
        var outdoor = {
          title: item.title.whole,
          id: item._id,
          pic: (item.brief && item.brief.pics && item.brief.pics.length > 0) ? item.brief.pics[0].src : null,
          memCount: item.members.length + item.addMembers.length,
          maxCount: item.limits.maxPerson ? item.limits.personCount : "∞",
          openid: item._openid,
          leader: item.leader ? item.leader : item.members[0],
          status: item.status,
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

  buildFunction() {
    const self = this
    for (var i = 0; i < self.data.outdoors.length; i++) {
      let index = i; // 还必须用let才行
      this["intoOutdoor" + index] = (e) => {
        self.intoOutdoor(index, e)
      }
    }
  },

  intoOutdoor(index, e) {
    console.log(e)
    const self = this
    const oneOutdoor = self.data.outdoors[index]
    // if (oneOutdoor.openid == app.globalData.openid) {
    if (oneOutdoor.leader.personid == app.globalData.personid) {
      // 自己创建的活动，进入编辑
      util.saveOutdoorID(oneOutdoor.id)
      wx.switchTab({
        url: '../CreateOutdoor/CreateOutdoor',
      })
    } else {
      // 别人的活动，进入报名页面
      wx.navigateTo({
        url: '../EntryOutdoor/EntryOutdoor?outdoorid=' + oneOutdoor.id,
      })
    }
  },

  openSetting() {
    this.setData({
      "setting.show": true,
    })
  },

  closeSetting() {
    this.setData({
      "setting.show": false,
    })
  },

  onShowOutdate(e) {
    console.log(e)
    const self = this
    this.setData({
      "setting.showOutdate": !self.data.setting.showOutdate,
    })
  },

  inputKeyword(e) {
    console.log(e)
    this.setData({
      "setting.keyword": e.detail,
    })
  },

  onConfirmSetting() {
    this.flushOutdoors(true, null)
    this.setData({
      "setting.show": false,
      "page.bottom": false,
    })
    wx.setStorageSync(this.data.Setting, this.data.setting)
  },

  onPullDownRefresh: function() {
    console.log("onPullDownRefresh")
    const self = this
    self.setData({
      isPulldown: true,
    })
    wx.showNavigationBarLoading()

    this.flushOutdoors(true, res => {
      wx.hideNavigationBarLoading();
      wx.stopPullDownRefresh();
      self.setData({
        isPulldown: false,
      })
    })
  },

  onReachBottom: function() {
    console.log("onReachBottom")
    const self = this
    if (!self.data.page.bottom) {
      self.data.page.no++
        self.flushOutdoors(false, null)
    }
  },

  onShareAppMessage: function() {
    return {
      title: "活动大厅",
      path: 'pages/AboutOutdoor/HallOutdoor',
    }
  },

  adError(e) {
    console.error(e)
  },

})