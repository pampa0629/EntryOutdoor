const app = getApp()
const util = require('../../utils/util.js')
const odtools = require('../../utils/odtools.js')
const template = require('../../utils/template.js')
const cloudfun = require('../../utils/cloudfun.js')
const lvyeorg = require('../../utils/lvyeorg.js')
const promisify = require('../../utils/promisify.js')

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
    sendWxnotice: false, // 发送留言时，是否自动发送微信消息

    hasPullFlush: false, // 本页面是否下拉刷新过
    showMembers: false, // 是否显示队员名单， @时出来
    members: [], // 全体队员名单
    personids: [], // 全队队员的id
    isLeader: false, // 是否为领队，领队可以 @所有人 

    tid: null, // lvyeorg上的帖子id
  },

  onLoad: function(options) {
    console.log(options)
    const self = this
    self.data.outdoorid = options.outdoorid
    options.tid = options.tid ? options.tid : null
    self.setData({
      tid: options.tid
    })
    if (options.isLeader == "true") {
      self.setData({
        isLeader: true,
      })
      self.data.members.push("所有人") // 领队可以给@所有人
      self.data.personids.push("")
    }
    console.log("options.isLeader: " + options.isLeader)
    if (options.sendWxnotice) { // 通过点击别人发送的微信消息进入留言页面时，自动@对方
      self.setData({
        sendWxnotice: true,
        "message.msg": "@" + options.nickName + " ",
      })
    }

    self.flushChats(null, res => {
      res.data.members.forEach((item, index) => {
        self.data.members.push(item.userInfo.nickName)
        self.data.personids.push(item.personid)
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
  async flushLvyrorg2Chat(outdoorid, websites, leader) {
    console.log("ChatOutdoor.flushLvyrorg2Chat()")
    const self = this
    if (websites && websites.lvyeorg && websites.lvyeorg.tid) {
      self.data.tid = websites.lvyeorg.tid
      console.log("websites.lvyeorg.chatPosition is:" + websites.lvyeorg.chatPosition)
      var begin = websites.lvyeorg.chatPosition ? websites.lvyeorg.chatPosition : 0
      let posts = await lvyeorg.loadPosts(self.data.tid, begin)
      if (posts && posts.length > 0) {
        posts.forEach((item, index) => {
          // 确认不是小程序发的帖子，才能作为留言
          // 先把 </div> 前面的内容去掉
          var findDiv = item.message.indexOf("</div>")
          if (findDiv >= 0) {
            item.message = item.message.substring(findDiv)
          }
          // console.log(item)
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
        // cloudfun.updateOutdoorWebsites(outdoorid, websites)
        cloudfun.opOutdoorItem(outdoorid, "websites", websites, "")
        // 更新最小单元，防止云数据库修改数据结构类型
        cloudfun.opOutdoorItem(self.data.outdoorid, "chat.messages", self.data.chat.messages, "")
      }
    }
  },

  // 退出时，把当前留言有几条记录下来
  onUnload() {
    console.log("onUnload")
    const self = this
    cloudfun.opOutdoorItem(self.data.outdoorid, "chat.seen." + app.globalData.personid, self.data.chat.messages.length, "")
  },

  flushChats(addMessage, callback) {
    console.log("flushChats()")
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

          // 增加函数，确定who
          let index = i; // 还必须用let才行
          this["tapWho" + index] = (e) => {
            this.tapWho(index, e)
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

  async changeSendWxnotice(e) {
    console.log("changeSendWxnotice()")
    const self = this
    if (e.detail) {
      let res = await promisify.showModal({
        title: '请确认开启',
        content: '开启该选项将导致@成员的留言同时也发送微信消息，可能给对方造成打扰，也不能保证一定送达。请慎重开启！',
      })
      if (res.confirm) {
        self.setData({
          sendWxnotice: true
        })
      }
    } else {
      self.setData({
        sendWxnotice: false
      })
    }
  },

  submitChat(e) {
    console.log("submitChat()")
    template.savePersonFormid(app.globalData.personid, e.detail.formId, null)

    const self = this
    if (self.data.message.msg) {
      var message = odtools.buildChatMessage(self.data.message.msg)
      console.log(message)
      // load
      self.flushChats(message, null)
      // 发送微信消息
      if (this.data.sendWxnotice) {
        this.sendWxnotice(message.msg)
      }
      // push 到数据库中 
      cloudfun.opOutdoorItem(self.data.outdoorid, "chat.messages", message, "push")
      // push 到org网站 
      if (self.data.tid) {
        var chatMessage = lvyeorg.buildChatMessage(message)
        lvyeorg.postMessage(self.data.outdoorid, self.data.tid, chatMessage.title, chatMessage.message)
      }

      // 输入框清空
      self.setData({
        "message.msg": "",
      })
      console.log(self.data.chat.messages)
    }
  },

  sendWxnotice(msg) {
    var personids = this.findPersonids(msg)
    personids.forEach((item, index) => {
      template.sendChatMsg2Member(item, this.data.title, this.data.outdoorid, app.globalData.userInfo.nickName, app.globalData.userInfo.phone, msg)
    })
  },

  // msg: xxx @name xxx@name xxx
  findPersonids(msg) {
    var personids = []
    const self = this
    if (msg.match("@所有人")) {
      return self.data.personids
    }
    this.data.members.forEach((item, index) => {
      if (msg.match("@" + item)) {
        personids.push(self.data.personids[index])
      }
    })
    return personids
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

  gotoLvyeOrg() {
    var url = 'pages/detail/detail?tid=' + this.data.tid
    wx.navigateToMiniProgram({
      appId: 'wx1599b7c8d1e2b4d4', // 要跳转的小程序的appid
      path: url, // 跳转的目标页面
    })
  },

  tapWho(index, e) {
    const self = this
    console.log(e)
    const who = self.data.chat.messages[index].who
    self.setData({
      "message.msg": self.data.message.msg + "@" + who + " ",
    })
  },

  copyMessage(index) {
    const self = this
    wx.setClipboardData({
      data: self.data.chat.messages[index].msg,
    })
  },

  onEnterGroup() {
    const self = this;
    wx.navigateTo({
      url: "../AboutGroup/ChatGroup?outdoorid=" + self.data.outdoorid + "&isLeader=" + self.data.isLeader
    })
  },

})