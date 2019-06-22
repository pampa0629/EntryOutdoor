const app = getApp()
const util = require('../../utils/util.js')
const cloudfun = require('../../utils/cloudfun.js')
const template = require('../../utils/template.js')
const odtools = require('../../utils/odtools.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
 
Page({  

  data: {
    outdoorid: null,
    title: "",
    members: [],
    limits:null, 
    index: null, // 当前正在处理的index
    isLeader:false, // 判断自己是不是总领队

    showCheckPopup: false, // 弹出审核菜单
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

    showAppointPopup: false, // 弹出授权菜单
    cfo:{}, // 财务官

    addMembers: [], // 领队外挂
    addMember: "",
    entryFull:false, // 是否报名已满，防止领队添加过多附加队员
    hasModified: false, // 
    openAdd: false, // 是否开启附加队员
  },

  onLoad: function(options) {
    const self = this;
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    let od = pages[pages.length - 2].data.od;
    self.data.outdoorid = od.outdoorid
    self.data.title = od.title.whole
    self.data.limits = od.limits
    self.setData({
      entryFull:odtools.entryFull(od.limits, od.members, od.addMembers)
    })

    if(od.leader.personid == app.globalData.personid) {
      self.setData({ // 判断是否为总领队
        isLeader:true,
      })
    }
    if (od.pay && od.pay.cfo){
      self.setData({
        cfo: od.pay.cfo, 
      })
    }
    // 构建正式队员列表
    self.flushMembers(od.members)
    // 处理附加队员
    self.flushAddMembers(od.addMembers)
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
      this["onCheckPopup" + index] = () => {
        this.onCheckPopup(index)
      }
      this["onAppointPopup" + index] = () => {
        this.onAppointPopup(index)
      }
      this["longPressMember" + index] = () => {
        this.longPressMember(index)
      } 
    }
    self.setData({
      members: self.data.members,
      entryFull:odtools.entryFull(self.data.limits, self.data.members, self.data.addMembers)
    })
  },

  save(e) {
    const self = this;
    console.log("CheckMembers save()")
    console.log("this.data.hasModified：" + this.data.hasModified)
    if (e)
      template.savePersonFormid(app.globalData.personid, e.detail.formId, null)

    if (this.data.hasModified) {
      let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
      let prevPage = pages[pages.length - 2];
      prevPage.setData({
        "od.addMembers": self.data.addMembers,
      })
      prevPage.data.od.saveItem("addMembers")
      this.setData({
        hasModified: false,
      })
    }
  },

  onUnload: function() {
    console.log("onUnload()")
    this.save() // 自动保存
  },

  giveup(e) {
    console.log("giveup()")
    template.savePersonFormid(app.globalData.personid, e.detail.formId, null)
    this.data.hasModified = false
    wx.navigateBack({})
  },

  longPressMember(index) {
    util.phoneCall(this.data.members[index].phone, false)
  },

  onSetLeader() {
    const self = this
    dbOutdoors.doc(self.data.outdoorid).get().then(res=>{
      odtools.findPersonIndex(res.data.members, self.data.members[self.data.index].personid, index=>{
        console.log("person index: "+index)
        var temp = res.data.members[0]
        res.data.members[0] = res.data.members[index]
        res.data.members[0].entryInfo.status = "领队"
        res.data.members[index] = temp
        res.data.members[index].entryInfo.status = "领队组"
        cloudfun.updateOutdoorMembers(self.data.outdoorid, res.data.members)
        cloudfun.updateOutdoorLeader(self.data.outdoorid, res.data.members[0])
        // 刷新当前列表
        self.flushMembers(res.data.members)
        // 给所有队员发通知
        res.data.members.forEach((item, i)=>{
          // old(index) ==> new （0）
          template.sendResetMsg2Member(self.data.outdoorid, item.personid, res.data.title.whole, res.data.members[index].userInfo.nickName, res.data.members[0].userInfo.nickName)
        })
      })
    })
  },

  onCheckPopup(index) {
    console.log("onCheckPopup")
    console.log(index)
    this.setData({
      showCheckPopup: true,
      showAppointPopup: false,
      index: index,
    })
  },

  closeCheckPopup() {
    console.log("closeCheckPopup")
    this.setData({
      showCheckPopup: false,
    })
  },

  onAppointPopup(index) {
    console.log("onAppointPopup")
    console.log(index)
    this.setData({
      showAppointPopup: true,
      showCheckPopup: false,
      index: index,
    })
  },

  closeAppointPopup() {
    console.log("closeAppointPopup")
    this.setData({
      showAppointPopup: false,
    })
  },

  onLookCareer(e) {
    console.log("onLookCareer")
    console.log(e)
    const self = this
    wx.navigateTo({
      url: '../MyInfo/LookCareer?personid=' + self.data.members[self.data.index].personid,
    })
  },

  onCallPhone() {
    console.log("onCallPhone")
    util.phoneCall(this.data.members[this.data.index].phone, false)
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

  // 设为财务官
  onSetCFO() {
    console.log("onSetCFO")
    const self = this
    const member = self.data.members[self.data.index]
    var cfo = {personid:member.personid, nickName:member.nickName}
    odtools.setCFO(self.data.outdoorid, cfo)
    self.setData({
      cfo:cfo, 
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
      // { "msg": "加油 @papa", "personid": "W72p-92AWotkbObV", "self": true, "who": "PiPi" }
      var message = {
        // at: item.nickName,
        personid: app.globalData.personid,
        msg: content + " @"+item.nickName,
        who: app.globalData.userInfo.nickName
      }
      // cloudfun.pushOutdoorChatMsg(self.data.outdoorid, message)
      cloudfun.opOutdoorItem(self.data.outdoorid, "chat.messages", message, "push")

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
      
      // 增加活动留言
      // { "msg": "xxx @nickName", "personid": "W72p-92AWotkbObV", "who": "领队" }
      content = "报名被驳回，理由是：" + content
      var message = {
        personid: app.globalData.personid,
        msg: content + " @" + item.nickName,
        who: app.globalData.userInfo.nickName
      }
      cloudfun.pushOutdoorChatMsg(self.data.outdoorid, message)

      // 从队员报名表中剔除
      var selfQuit = false
      let prevPage = pages[pages.length - 2];
      let od = pages[pages.length - 2].data.od;
      od.quit(item.personid, selfQuit, members=>{ // 这里面会发送微信消息
        prevPage.setData({
          "od.members":od.members
        })
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

  changeOneMember(e) {
    console.log(e)
    this.setData({
      addMember:e.detail,
    })
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
    this.data.addMembers.push(this.data.addMember)
    this.setData({
      hasModified: true
    })
    this.flushAddMembers(this.data.addMembers)
    this.setData({
      addMember: "" // 清空
    })
  },

  // 删除 index位置的附加队员
  delAddMembers(index) {
    this.data.addMembers.splice(index, 1)
    this.setData({
      hasModified: true
    })
    this.flushAddMembers(this.data.addMembers)
  },

  // 创建 删除附加队员按钮
  flushAddMembers(addMembers) {
    const self = this
    self.setData({
      addMembers: addMembers,
      entryFull: odtools.entryFull(self.data.limits, self.data.members, self.data.addMembers)
    })
    
    for (var i = 0; i < self.data.addMembers.length; i++) {
      let index = i // 还必须用let才行
      this["delAddMembers" + index] = () => {
        self.delAddMembers(index)
      }
    }
  }

})