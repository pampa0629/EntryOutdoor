const app = getApp()
const template = require('../../utils/template.js')
const cloudfun = require('../../utils/cloudfun.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
const dbPersons = db.collection('Persons')
const _ = db.command

Page({

  data: {
    hasSubscribed: false, // 是否订阅领队
    leaderid: null, // 领队id
    mine: {
      acceptNotice: true
    }, // 对该领队的订阅信息

    formids: [], // 消息id
    outdoors: {}, // 领队发起的活动列表
  },

  async onLoad(options) {
    const self = this
  
    // 读取领队信息
    console.log(options)
    this.data.leaderid = options.leaderid
    let res = await dbPersons.doc(this.data.leaderid).get()
    // todo 这里应该过滤掉领队发布的测试活动，取消的活动，以及未来的私密活动
    this.setData({
      outdoors: res.data.myOutdoors,
    }) 
    if (res.data.subscribers && res.data.subscribers[app.globalData.personid]) {
      this.setData({
        mine: res.data.subscribers[app.globalData.personid], // 得到自己的订阅信息
        hasSubscribed: true
      })
    }

    if (app.checkLogin()) {
      // 得到过滤后的formids
      let formids = template.clearPersonFormids(app.globalData.personid)
      this.setData({
        formids: formids,
      })
      console.log(this.data.formids.length)
    }
  },

  onUnload() {
    const self = this
    // 领队用云函数
    console.log(self.data.mine)
    // cloudfun.updatePersonSubscriber(self.data.leaderid, app.globalData.personid, self.data.mine)
    cloudfun.opPersonItem(self.data.leaderid, "subscribers."+app.globalData.personid, self.data.mine, "")
  },

  // 订阅领队/取消订阅
  SubscribeLeader(e) {
    console.log("SubscribeLeader")
    const self = this
    this.addCount(e)
    self.setData({
      hasSubscribed: !self.data.hasSubscribed,
    })
    console.log("Subscribed is: " + self.data.hasSubscribed)
  },

  checkAccept() {
    console.log("checkAccept")
    const self = this
    self.setData({
      "mine.acceptNotice": !self.data.mine.acceptNotice,
    })
    console.log(self.data.mine.acceptNotice)
  },

  addCount(e) {
    console.log("addCount: " + e.detail.formId)
    const self = this
    template.savePersonFormid(app.globalData.personid, e.detail.formId)
    self.data.formids.push(e.detail.formId)
    self.setData({
      formids: self.data.formids
    })
  },

})