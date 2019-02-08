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
    outdoorid: null,
    title: null,
    message: {
      who: "",
      msg: "",
      personid: "",
    },
    chat: {
      messages: []
    },

    hasPullFlush: false, // 本页面是否下拉刷新过
    showMembers: false, // 是否显示队员名单， @时出来
    members: [], // 全体队员名单
    isLeader: false, // 是否为领队，领队可以 @所有人 

    tid: null, // lvyeorg上的帖子id
  },

  onLoad: function(options) {
    console.log(options)
    const self = this
    self.data.outdoorid = options.outdoorid
    if (options.isLeader == "true") {
      self.setData({
        isLeader:true,
      })
      self.data.members.push("所有人")
    }
    console.log("options.isLeader: " + options.isLeader)
    self.flushChats(null, res => {
      res.data.members.forEach((item, index) => {
        self.data.members.push(item.userInfo.nickName)
      })
      self.setData({
        members: self.data.members,
        title: res.data.title.whole,
        hasPullFlush: wx.getStorageSync(self.data.outdoorid + ".hasPullFlush"),
      })
      self.flushLvyrorg2Chat(self.data.outdoorid, res.data.websites, res.data.members[0].userInfo.nickName)
    })
  },

  // 把org上的留言消息刷新到留言上
  flushLvyrorg2Chat(outdoorid, websites, leader) {
    const self = this
    if (websites && websites.lvyeorg && websites.lvyeorg.tid) {
      self.data.tid = websites.lvyeorg.tid
      console.log("websites.lvyeorg.chatPosition is:" + websites.lvyeorg.chatPosition)
      var begin = websites.lvyeorg.chatPosition ? websites.lvyeorg.chatPosition : 0
      lvyeorg.loadPosts(self.data.tid, begin, posts => {
        if (posts.length > 0) {
          console.log(posts)
          posts.forEach((item, index) => {
            // 确认不是小程序发的帖子，才能作为留言
            // 先把 </div> 前面的内容去掉
            var findDiv = item.message.indexOf("</div>")
            if (findDiv >= 0) {
              item.message = item.message.substring(findDiv)
            }
            console.log(item)
            console.log("find:" + item.message.indexOf("户外报名"))
            if (item.message.indexOf("户外报名") < 0 && item.message.indexOf("小程序") < 0) {
              var message = {
                msg: "(来自绿野org)：" + item.subject + item.message + " @" + leader,
                who: item.author,
              }
              self.data.chat.messages.push(message)
            }
          })
          for (var i = 0; i < self.data.chat.messages.length; i++) {
            let index = i // 还必须用let才行
            this["copyMessage" + index] = () => {
              self.copyMessage(index)
            }
          }
          self.setData({
            chat: self.data.chat
          })
          websites.lvyeorg.chatPosition = posts[posts.length - 1].position
          console.log("after, websites.lvyeorg.chatPosition is:" + websites.lvyeorg.chatPosition)
          cloudfun.updateOutdoorWebsites(outdoorid, websites)
          cloudfun.updateOutdoorChat(self.data.outdoorid, self.data.chat)
        }
      })
    }
  },

  // 退出时，把当前留言有几条记录下来
  onUnload() {
    console.log("onUnload")
    const self = this 
    cloudfun.updateOutdoorChatSeen(self.data.outdoorid, app.globalData.personid, self.data.chat.messages.length)
  },

  flushChats(addMessage, callback) {
    const self = this
    dbOutdoors.doc(self.data.outdoorid).get().then(res => {
      if (res.data.chat) { // 数据库有，就覆盖一下
        self.data.chat = res.data.chat
        if (!self.data.chat.messages) {
          self.data.chat.messages = []
        }
        for (var i = 0; i < self.data.chat.messages.length; i++) {
          const message = self.data.chat.messages[i]
          // 通过personid判断哪些消息是自己的
          if (message.personid == app.globalData.personid) {
            message.self = true
          } else {
            message.self = false
          }

          // 对 at 标签的兼容性判断
          if (message.at && (message.at == app.globalData.userInfo.nickName)) {
            message.msg += " @" + app.globalData.userInfo.nickName + " "
          }
          // 判断是否@自己了
          if (message.msg.indexOf("@" + app.globalData.userInfo.nickName) >= 0 || message.msg.indexOf("@所有人") >= 0) {
            message.atme = true
          }
        }
      }
      if (addMessage) {
        console.log(self.data.chat.messages)
        self.data.chat.messages.push(addMessage)
      }
      self.setData({
        chat: self.data.chat,
      })
      if (callback) {
        callback(res)
      }
    })
  },

  inputChat(e) {
    console.log(e)
    const self = this
    self.setData({
      "message.msg": e.detail.value
    })
    const msg = self.data.message.msg
    console.log(msg)
    if (msg.length > 0 && msg.charAt(msg.length - 1) == "@") {
      self.setData({
        showMembers: true,
      })
    }
  },

  // 关闭 @ 选择项
  onCloseMembers() {
    this.setData({
      showMembers: false,
    })
  },

  onCancelMembers() {
    this.setData({
      showMembers: false,
    })
  },

  // 进行@ 选择
  onConfirmMembers(e) {
    console.log(e)
    const self = this
    self.setData({
      "message.msg": self.data.message.msg + e.detail.value,
      showMembers: false,
    })
  },

  submitChat() {
    console.log("submitChat")
    const self = this
    if (self.data.message.msg) {
      var message = outdoor.buildChatMessage(self.data.message.msg)
      console.log(self.data.message)
      // load
      self.flushChats(message, null)
      // push 到数据库中
      cloudfun.pushOutdoorChatMsg(self.data.outdoorid, message)
      // 输入框清空
      self.setData({
        "message.msg": "",
      })
      console.log(self.data.messages)
    }
  },

  // 页面相关事件处理函数--监听用户下拉动作  
  onPullDownRefresh: function() {
    console.log("onPullDownRefresh")
    wx.showNavigationBarLoading();
    this.flushChats(null, res => {
      wx.hideNavigationBarLoading();
      wx.stopPullDownRefresh();
    })
    var key = this.data.outdoorid + ".hasPullFlush"
    wx.setStorageSync(key, true)
    this.setData({
      hasPullFlush: true,
    })
  },

  // 页面上拉触底事件的处理函数 
  onReachBottom: function() {
    console.log("onReachBottom")
    this.flushChats(null, null)
  },

  tapWho(e) {
    const self = this
    console.log(e)
    self.setData({
      "message.msg": self.data.message.msg + "@" + e._relatedInfo.anchorTargetText + " ",
    })
  },

  copyMessage(index) {
    const self = this
    wx.setClipboardData({
      data: self.data.chat.messages[index].msg,
    })
  },

  onEnterGroup(){
    const self = this;
    wx.navigateTo({
      url: "../AboutOutdoor/ChatGroup?outdoorid=" + self.data.outdoorid + "&isLeader="+self.data.isLeader
    })
  },

})