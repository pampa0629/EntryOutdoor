const app = getApp()
const util = require('../../utils/util.js')
const cloudfun = require('../../utils/cloudfun.js')
const template = require('../../utils/template.js')
const outdoor = require('../../utils/outdoor.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')

Page({

  data: {
    outdoorid: null,
    title: "",
    members: [],
    index: null, // 当前正在处理的index
    isLeader:false, // 判断自己是不是总领队

    showPopup: false, // 分享弹出菜单
    chatDlg: { // 留言对话框
      show: false,
      content: "",
      select: null,
      Options: ["请补充户外履历", "请填写完整和正确的手机号码", "其它"],
    },
    rejectDlg: { // 驳回报名对话框
      show: false,
      content: "",
      select: null,
      Options: ["体力不能胜任", "户外装备不全", "户外经验不足", "必须认路", "只限熟人", "其它"],
    },

    addMembers: [], // 领队外挂
    addMember: "",
    hasModified: false, // 
    openAdd: false, // 是否开启附加队员
  },

  onLoad: function(options) {
    const self = this;
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    self.data.outdoorid = prevPage.data.outdoorid
    self.data.title = prevPage.data.title.whole
    if(prevPage.data.leader.personid == app.globalData.personid) {
      self.setData({ // 判断是否为总领队
        isLeader:true,
      })
    }
    self.flushMembers(prevPage.data.members)
    // 处理附加队员
    self.loadAddMembers(self.data.outdoorid)
  },

  loadAddMembers(outdoorid) {
    const self = this
    dbOutdoors.doc(outdoorid).get().then(res => {
      if (res.data.addMembers) {
        self.flushAddMembers(res.data.addMembers)
      }
    })
  },

  flushMembers(members) {
    const self = this;
    self.data.members = []
    const s = members
    for (var i = 0; i < s.length; i++) {
      var knowWay = s[i].entryInfo.knowWay ? "认路" : "不认路"
      var member = {
        nickName: s[i].userInfo.nickName,
        gender: s[i].userInfo.gender,
        phone: s[i].userInfo.phone,
        knowWay: knowWay,
        status: s[i].entryInfo.status,
        personid: s[i].personid,
      }
      self.data.members.push(member)

      // 增加函数
      let index = i; // 还必须用let才行
      this["onPopup" + index] = () => {
        this.onPopup(index)
      }
      this["longPressMember" + index] = () => {
        this.longPressMember(index)
      }
    }
    self.setData({
      members: self.data.members,
    })
  },

  onUnload: function() {
    const self = this;
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    dbOutdoors.doc(self.data.outdoorid).get().then(res => {
      prevPage.setData({
        members: res.data.members,
      })
    })
    if (self.data.hasModified) {
      cloudfun.updateOutdoorAddMembers(self.data.outdoorid, self.data.addMembers)
    }
  },

  longPressMember(index) {
    util.phoneCall(this.data.members[index].phone, false)
  },

  onMakecall() {
    util.phoneCall(this.data.members[this.data.index].phone, false)
  },

  onPopup(index) {
    console.log("onPopup")
    console.log(index)
    this.setData({
      showPopup: true,
      index: index,
    })
  },

  closePopup() {
    console.log("closePopup")
    this.setData({
      showPopup: false,
    })
  },

  onLookCareer() {
    console.log("onLookCareer")
    const self = this
    wx.navigateTo({
      url: 'LookCareer?personid=' + self.data.members[self.data.index].personid,
    })
  },

  onLeaderGroup() {
    console.log("onLeaderGroup")
    const self = this
    dbOutdoors.doc(self.data.outdoorid).get().then(res => {
      res.data.members.forEach((item, index) => {
        if (item.personid == self.data.members[self.data.index].personid) {
          if (item.entryInfo.status != "领队组"){
            item.entryInfo.status = "领队组"
          } else {
            item.entryInfo.status = "报名中"
          }
        }
      })
      self.flushMembers(res.data.members)
      cloudfun.updateOutdoorMembers(self.data.outdoorid, res.data.members)
    })
  },

  //////////////////// 留言询问 //////////////////////////
  onChatMessage() {
    console.log("onChatMessage")
    const self = this
    this.setData({
      "chatDlg.show": true
    })
  },

  closeChatDlg(e) {
    console.log(e)
    this.setData({
      "chatDlg.show": false
    })
  },

  confirmChatDlg(e) {
    console.log(e)
    const self = this

    var content = ""
    self.data.chatDlg.selects.forEach((item, index) => {
      var temp = self.data.chatDlg.Options[item]
      if (temp == "其它") {
        temp = self.data.chatDlg.content
      }
      content += temp
      if (index != self.data.chatDlg.selects.length - 1) {
        content += "，"
      }
    })

    console.log(content)
    if (content) {
      const item = self.data.members[self.data.index]
      // 发模板消息
      template.sendChatMsg2Member(item.personid, self.data.title, self.data.outdoorid, app.globalData.userInfo.nickName, app.globalData.userInfo.phone, content)

      // 增加活动留言
      // { "at": "papa", "msg": "加油", "personid": "W72p-92AWotkbObV", "self": true, "who": "PiPi" }
      var message = {
        at: item.nickName,
        personid: app.globalData.personid,
        msg: content,
        who: app.globalData.userInfo.nickName
      }
      cloudfun.pushOutdoorChatMsg(self.data.outdoorid, message)

      this.setData({
        "chatDlg.show": false
      })
    } else {
      this.setData({
        "chatDlg.show": true
      })
      wx.showModal({
        title: '必须有内容',
        content: '请必须选择/填写询问事由',
        confirmText: "知道了",
        showCancel: false,
      })
    }
  },

  changeChatSelects(e) {
    console.log(e)
    this.setData({
      "chatDlg.selects": e.detail
    })
  },

  changeChatContent(e) {
    console.log(e)
    this.setData({
      "chatDlg.content": e.detail
    })
  },

  ///// 驳回报名 ////// 

  onReject() {
    console.log("onReject")
    const self = this
    this.setData({
      "rejectDlg.show": true
    })
  },

  closeRejectDlg(e) {
    console.log(e)
    this.setData({
      "rejectDlg.show": false
    })
  },

  confirmRejectDlg(e) {
    console.log(e)
    const self = this

    var content = ""
    self.data.rejectDlg.selects.forEach((item, index) => {
      var temp = self.data.rejectDlg.Options[item]
      if (temp == "其它") {
        temp = self.data.rejectDlg.content
      }
      content += temp
      if (index != self.data.rejectDlg.selects.length - 1) {
        content += "，"
      }
    })
    console.log(content)

    if (content) {
      // 发送留言和微信消息
      const item = self.data.members[self.data.index]
      // 发模板消息
      template.sendRejectMsg2Member(item.personid, self.data.title, self.data.outdoorid, app.globalData.userInfo.nickName, app.globalData.userInfo.phone, content)

      // 增加活动留言
      // { "at": "papa", "msg": "加油", "personid": "W72p-92AWotkbObV", "self": true, "who": "PiPi" }
      content = "报名被驳回，理由是：" + content
      var message = {
        at: item.nickName,
        personid: app.globalData.personid,
        msg: content,
        who: app.globalData.userInfo.nickName
      }
      cloudfun.pushOutdoorChatMsg(self.data.outdoorid, message)

      // 从队员报名表中剔除
      var selfQuit = false
      outdoor.removeMember(self.data.outdoorid, item.personid, selfQuit, members => {
        console.log(members)
        self.flushMembers(members)
      })

      this.setData({
        "rejectDlg.show": false
      })
    } else {
      this.setData({
        "rejectDlg.show": true
      })
      wx.showModal({
        title: '必须有理由',
        content: '请必须选择/填写驳回理由',
        confirmText: "知道了",
        showCancel: false,
      })
    }
  },

  changeRejectSelects(e) {
    console.log(e)
    this.setData({
      "rejectDlg.selects": e.detail
    })
  },

  changeRejectContent(e) {
    console.log(e)
    this.setData({
      "rejectDlg.content": e.detail
    })
  },

  /////////////////////////// 附加队员的处理 /////////////////////
  // 是否开启附加队员编辑功能
  changeAddOpen(e) {
    this.setData({
      openAdd: e.detail,
    })
  },

  // 删除 index位置的附加队员
  delAddMembers(index) {
    const self = this
    self.data.addMembers.splice(index, 1)
    self.data.hasModified = true
    self.flushAddMembers(self.data.addMembers)
  },

  // 拷贝附加队员信息
  copyAddMember() {
    const self = this
    wx.getClipboardData({
      success: function(res) {
        console.log(res.data)
        self.setData({
          addMember: res.data,
        })
      }
    })
  },

  // 增加附加队员到列表中
  addOneMember() {
    const self = this
    self.data.addMembers.push(self.data.addMember)
    self.data.hasModified = true
    self.flushAddMembers(self.data.addMembers)
    self.setData({
      addMember: "" // 清空
    })
  },

  // 创建 删除附加队员按钮
  flushAddMembers(addMembers) {
    const self = this
    self.setData({
      addMembers: addMembers
    })
    for (var i = 0; i < self.data.addMembers.length; i++) {
      let index = i // 还必须用let才行
      this["delAddMembers" + index] = () => {
        self.delAddMembers(index)
      }
    }
  }

})