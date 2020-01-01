const app = getApp()
const template = require('../../utils/template.js')
const cloudfun = require('../../utils/cloudfun.js')
const promisify = require('../../utils/promisify.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
const dbPersons = db.collection('Persons')
const _ = db.command

Page({

  data: {
    hasSubscribed: false, // 是否订阅领队
    leaderid: null, // 领队id
    // 对该领队的订阅信息
    mine: {
      acceptNotice: true,
      messageCount: 0, // 订阅消息数量
    }, 

    formids: [], // 模板消息id
    outdoors: {}, // 领队发起的活动列表
    size: app.globalData.setting.size, // 界面大小
  },

  onShow() {
    this.setData({
      size: app.globalData.setting.size
    })
  },

  async onLoad(options) {
    console.log("SubscribeLeader.onLoad()",options)
    
    // 读取领队信息
    this.data.leaderid = options.leaderid
    let res = await dbPersons.doc(this.data.leaderid).get()
    // todo 这里应该过滤掉领队发布的测试活动，取消的活动，以及未来的私密活动
    this.setData({
      outdoors: res.data.myOutdoors,
    }) 
    
    if (res.data.subscribers && res.data.subscribers[app.globalData.personid]) {
      this.setData({
        mine: res.data.subscribers[app.globalData.personid], // 得到自己是否订阅了领队
        hasSubscribed: true
      })
      // 防止为null
      if (!this.data.mine.messageCount) {
        this.setData({
          "mine.messageCount": 0
        })
      }
    }

    if (app.checkLogin()) {
      // 得到过滤后的formids
      let formids = await template.clearPersonFormids(app.globalData.personid)
      this.setData({
        formids: formids,
      })
      console.log("formids.length:", this.data.formids.length)
    }
  },

  onUnload() {
    console.log("SubscribeLeader.onUnload()")
    // 领队用云函数
    console.log(this.data.mine)
    cloudfun.opPersonItem(this.data.leaderid, "subscribers." + app.globalData.personid, this.data.mine, "")
  },

  // 订阅领队/取消订阅
  subscribeLeader(e) {
    console.log("subscribeLeader()")
    this.addCount(e)
    this.setData({
      hasSubscribed: !this.data.hasSubscribed,
    })
    console.log("Subscribed is: " + this.data.hasSubscribed)
  },

  checkAccept() {
    console.log("SubscribeLeader.checkAccept()")
    this.setData({
      "mine.acceptNotice": !this.data.mine.acceptNotice,
    })
    console.log(this.data.mine.acceptNotice)
  },

  // 增加模板消息数量
  addCount(e) {
    console.log("SubscribeLeader.addCount(): " + e.detail.formId)
    template.savePersonFormid(app.globalData.personid, e.detail.formId)
    console.log("formids: " + this.data.formids)
    this.data.formids.push(e.detail.formId)
    this.setData({ 
      formids: this.data.formids
    })
  },

  // 增加订阅消息数量
  async addMessageCount() {
    console.log("SubscribeLeader.addMessageCount() ")
    let res = await promisify.requestSubscribeMessage({
      tmplIds: ['EX-4r4qcQrxj1XkO1uhGAUA-fDnwjn6QnLB4pHWszNs', // 新活动通知
      ]
    }) 
    console.log("res: ", res)
    if(res.errMsg.indexOf("ok")) {
      this.setData({
        "mine.messageCount": this.data.mine.messageCount + 1
      })
    }
  },

})