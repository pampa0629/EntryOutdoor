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
    hasSubscribed:false, // 是否订阅领队
    leaderid:null, // 领队id
    mine: {acceptNotice:true}, // 对该领队的订阅信息

    formids:[], // 消息id
    outdoors: {}, // 领队发起的活动列表
  },

  onLoad: function (options) {
    const self = this

    // 读取领队信息
    console.log(options)
    self.data.leaderid = options.leaderid
    dbPersons.doc(self.data.leaderid).get().then(res=>{
      self.setData({
        outdoors : res.data.myOutdoors,
      })
      if (res.data.subscribers && res.data.subscribers[app.globalData.personid]){
        self.setData({
          mine: res.data.subscribers[app.globalData.personid],  // 得到自己的订阅信息
          hasSubscribed:true
        })
      }
    })

    // 得到过滤后的formids
    template.clearPersonFormids(app.globalData.personid, formids=>{
      self.setData({
        formids: formids,
      })
      console.log(self.data.formids.length)
    })
  },
 
  onUnload(){
    const self = this
    // 领队用云函数
    console.log(self.data.mine)
    cloudfun.updatePersonSubscriber(self.data.leaderid, app.globalData.personid, self.data.mine)
   },

  // 订阅领队/取消订阅
  SubscribeLeader(e){ 
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

  addCount(e){
    console.log("addCount: " + e.detail.formId)
    const self = this
    template.savePersonFormid(app.globalData.personid, e.detail.formId, null)
    self.data.formids.push(e.detail.formId)
    self.setData({
      formids: self.data.formids
    })
  },

})