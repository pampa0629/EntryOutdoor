const app = getApp()
const cloudfun = require('../../utils/cloudfun.js')
const promisify = require('../../utils/promisify.js')
const message = require('../../utils/message.js')

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

    app.checkLogin()
  },

  save() {
    console.log("SubscribeLeader.save()",this.data.mine)
    // 领队用云函数
    cloudfun.opPersonItem(this.data.leaderid, "subscribers." + app.globalData.personid, this.data.mine, "")
  },

  // 订阅领队/取消订阅
  subscribeLeader() {
    console.log("SubscribeLeader.subscribeLeader()")
    this.setData({
      hasSubscribed: !this.data.hasSubscribed,
    })
    console.log("Subscribed is: " + this.data.hasSubscribed)
    this.save()
  },
  
   // 增加订阅消息数量
   async addMessageCount() {
    console.log("SubscribeLeader.addMessageCount() ")
    let res = await promisify.requestSubscribeMessage({
      tmplIds: [
        message.CreateID, // 新活动通知
        message.ChatID, // 活动留言
      ]
    }) 
    console.log("res: ", res)
    if(res.errMsg.indexOf("ok")) {
      this.setData({
        "mine.messageCount": this.data.mine.messageCount + 1
      })
    }
    this.save()
  },

  // 是否接收消息通知
  checkAccept() {
    console.log("SubscribeLeader.checkAccept()")
    this.setData({
      "mine.acceptNotice": !this.data.mine.acceptNotice,
    })
    console.log(this.data.mine.acceptNotice)
    this.save()
  },
  
})