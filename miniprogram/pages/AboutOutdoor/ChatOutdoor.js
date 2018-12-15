const app = getApp()
const util = require('../../utils/util.js')
const outdoor = require('../../utils/outdoor.js')
const template = require('../../utils/template.js')
const cloudfun = require('../../utils/cloudfun.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
const dbPersons = db.collection('Persons')
const _ = db.command

Page({

  data: {
    outdoorid: null,
    title: null,
    message: {
      who: "",
      at: "",
      msg: "",
      personid: "",
    },
    chat: {messages:[]},
  },

  onLoad: function(options) {
    console.log(options)
    const self = this
    self.data.outdoorid = options.outdoorid
    self.flushChats(null, title => {
      self.setData({
        title: title,
      })
    })
  },

  // 退出时，把当前留言有几条记录下来
  onUnload(){
    console.log("onUnload")
    const self = this
    cloudfun.updateOutdoorChatSeen(self.data.outdoorid, app.globalData.personid,self.data.chat.messages.length)
  }, 

  flushChats(addMessage, callback) {
    const self = this
    console.log(self.data.chat)
    dbOutdoors.doc(self.data.outdoorid).get().then(res => {
      if (res.data.chat) { // 数据库有，就覆盖一下
        console.log(res.data.chat)
        self.data.chat = res.data.chat
        if (!self.data.chat.messages){
          self.data.chat.messages = []
        }
        for (var i = 0; i < self.data.chat.messages.length; i++) {
          // 通过personid判断哪些消息是自己的
          if (self.data.chat.messages[i].personid == app.globalData.personid) {
            self.data.chat.messages[i].self = true
          } else {
            self.data.chat.messages[i].self = false
          }
          // 判断是否@自己了
          if (self.data.chat.messages[i].at && (self.data.chat.messages[i].at == app.globalData.userInfo.nickName || self.data.chat.messages[i].msg.indexOf(app.globalData.userInfo.nickName)>=0 ) ) {
            self.data.chat.messages[i].atme = true
          }
        }
      }
      if (addMessage) {
        self.data.chat.messages.push(addMessage)
      }
      self.setData({
        chat: self.data.chat,
      })
      console.log(self.data.chat)
      if (callback) {
        callback(res.data.title.whole)
      }
    })
  },

  inputChat(e) {
    console.log(e)
    const self = this
    console.log(self.data.message)
    self.setData({
      "message.msg": e.detail.value
    })
    console.log(self.data.message)
  },

  buildMessage(msg, at) {
    var message = {}
    //  { who: "", msg: "", personid:"", self: false},
    message.who = app.globalData.userInfo.nickName
    message.personid = app.globalData.personid
    message.at = at
    message.msg = msg
    message.self = true // 肯定是自己了
    return message
  },

  submitChat() {
    console.log("submitChat")
    const self = this
    if (self.data.message.msg) {
      var message = self.buildMessage(self.data.message.msg, self.data.message.at)
      console.log(self.data.message)
      // load
      self.flushChats(message, null)
      // push 到数据库中
      cloudfun.pushOutdoorChatMsg(self.data.outdoorid, message)
      // 输入框清空
      self.setData({
        "message.msg": "",
        "message.at": ""
      })
      console.log(self.data.messages)
    }
  },

  // 页面相关事件处理函数--监听用户下拉动作  
  onPullDownRefresh: function() {
    console.log("onPullDownRefresh")
    wx.showNavigationBarLoading();
    this.flushChats(null, res=>{
      wx.hideNavigationBarLoading();
      wx.stopPullDownRefresh();
    })
  },

  // 页面上拉触底事件的处理函数 
  onReachBottom: function() {
    console.log("onReachBottom")
    this.flushChats(null, null)
  },

  tapWho(e){
    console.log(e)
    this.setData({
      "message.at":e._relatedInfo.anchorTargetText,
    })
  },

})