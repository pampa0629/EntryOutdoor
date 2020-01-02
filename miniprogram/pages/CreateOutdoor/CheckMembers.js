const app = getApp()
const util = require('../../utils/util.js')
const cloudfun = require('../../utils/cloudfun.js')
const template = require('../../utils/template.js')
const message = require('../../utils/message.js')
const odtools = require('../../utils/odtools.js')
const person = require('../../utils/person.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
  
Page({   

  data: {
    members: [],
    quitMembers:[], // 退出队员名单

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

    addMember: "",
    entryFull:false, // 是否报名已满，防止领队添加过多附加队员
    openAdd: false, // 是否开启附加队员

    size: app.globalData.setting.size, // 界面大小
  },

  onLoad: function(options) {
    let pages = getCurrentPages() //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2]
    let od = pages[pages.length - 2].data.od 
    this.setData({
      od:od, // od 存起来，方便使用
      entryFull:odtools.entryFull(od.limits, od.members, od.addMembers)
    })

    console.log(od.leader.personid ,app.globalData.personid)
    if(od.leader.personid == app.globalData.personid) {
      this.setData({ // 判断是否为总领队
        isLeader:true,
      })
    }
    console.log(this.data.isLeader)

    if (od.pay && od.pay.cfo){
      this.setData({
        cfo: od.pay.cfo, 
      })
    }
    // 构建正式队员列表
    this.flushMembers()
    // 处理附加队员
    this.flushAddMembers()
    // 处理需要AA费用的成员
    this.flushAaMembers()
    // 处理退出队员名单
    this.flushQuitMembers()
  },

  onShow() {
    this.setData({
      size: app.globalData.setting.size
    })
  },

  flushQuitMembers() {
    const ops = this.data.od.operations
    for (var i in ops) {
      // console.log("op:",ops[i])
      if (ops[i].action == "自行退出" || ops[i].action == "退出" || ops[i].action == "驳回报名") {
        this.data.quitMembers.push(ops[i])
      }
    }
    this.setData({
      quitMembers: this.data.quitMembers
    })
  },

  flushMembers() {
    var benchCount = 0 // 替补队员人数
    var occupyCount = 0 // 占坑队员人数
    const members = this.data.od.members
    const self = this
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
        meetsIndex: "第" + (parseInt(s[i].entryInfo.meetsIndex)+1)+"集合点",
      }
      self.data.members.push(member)
      if (member.status == "占坑中") {
        occupyCount += 1
      } else if (member.status == "替补中") {
        benchCount += 1
      }
 
      // 增加函数
      let index = i // 还必须用let才行
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
      occupyCount: occupyCount, 
      benchCount: benchCount, 
      members: self.data.members,
      entryFull:odtools.entryFull(self.data.od.limits, self.data.od.members, self.data.od.addMembers)
    })
  },

  flushAaMembers() {
    const members = this.data.od.aaMembers
    const self = this
    const s = members

    for (var i = 0; i < s.length; i++) {
      // 增加函数
      let index = i // 还必须用let才行
      this["onPhoneAA" + index] = () => {
        this.onPhoneAA(index)
      }
      this["onDeleteAA" + index] = () => {
        this.onDeleteAA(index)
      }
    }
  },
 
  onPhoneAA(index) {
    util.phoneCall(this.data.od.aaMembers[index].userInfo.phone, false)
  },

  onDeleteAA(index) {
    // todo 这里有删除的同时，又增加aa名单的冲突风险
    const members = this.data.od.aaMembers
    var deleted = members.splice(index, 1) 
    this.setData({
      "od.aaMembers":members
    })
    cloudfun.opOutdoorItem(this.data.od.outdoorid, "aaMembers", members, "")
  },

  onUnload: function() {
    console.log("onUnload()")
  },

  longPressMember(index) {
    util.phoneCall(this.data.members[index].phone, false)
  },

  async onSetLeader() {
    console.log("CheckMembers.onSetLeader()")
    const members = await this.data.od.transferLeader(app.globalData.personid, this.data.members[this.data.index].personid)
    this.setData({
      "od.members": members,
      isLeader:false
    })
    this.flushMembers()
    let pages = getCurrentPages() //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2]
    console.log("title:", )
    prevPage.setData({
      "od.title": this.data.od.title
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
    dbOutdoors.doc(self.data.od.outdoorid).get().then(res => {
      res.data.members.forEach((item, index) => {
        if (item.personid == self.data.members[self.data.index].personid) {
          if (item.entryInfo.status != "领队组"){
            item.entryInfo.status = "领队组"
          } else {
            item.entryInfo.status = "报名中"
          }
        }
      })
      // cloudfun.updateOutdoorMembers(self.data.od.outdoorid, res.data.members)
      cloudfun.opOutdoorItem(self.data.od.outdoorid, "members", res.data.members, "")
      self.setData({
        "od.members": res.data.members
      })
      self.flushMembers()
    })
  },

  // 设为财务官
  onSetCFO() {
    console.log("onSetCFO")
    const self = this
    const member = self.data.members[self.data.index]
    var cfo = {personid:member.personid, nickName:member.nickName}
    odtools.setCFO(self.data.od.outdoorid, cfo)
    self.setData({
      cfo:cfo, 
    })
    wx.showModal({
      title: '财务官设置成功',
      content: '已设置“'+member.nickName+'”为财务官，请提醒TA查看微信服务消息，点击进入活动收款页面，按页面提示步骤操作即可。若未收到微信消息，财务官可进入活动报名页面，点击第一排的“支付”图标进入收款页面。',
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
    if (self.data.chatDlg.selects) {
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
    }
    
    console.log(content)
    if (content) { 
      const item = self.data.members[self.data.index]
      // 发模板消息
      // template.sendChatMsg2Member(item.personid, self.data.od.title.whole, self.data.od.outdoorid, app.globalData.userInfo.nickName, app.globalData.userInfo.phone, content)
      // 订阅消息
      message.sendOdInfoChange(item.personid, self.data.od.outdoorid, self.data.od.title.whole, "领队：" + content)

      // 增加活动留言
      // { "msg": "加油 @papa", "personid": "W72p-92AWotkbObV", "self": true, "who": "PiPi" }
      var message = {
        // at: item.nickName,
        personid: app.globalData.personid,
        msg: content + " @"+item.nickName,
        who: app.globalData.userInfo.nickName
      }
      // cloudfun.pushOutdoorChatMsg(self.data.outdoorid, message)
      cloudfun.opOutdoorItem(self.data.od.outdoorid, "chat.messages", message, "push")

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

  async confirmRejectDlg(e) {
    console.log(e)
    const self = this

    var content = ""
    if (self.data.rejectDlg.selects) {
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
    }
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
      cloudfun.opOutdoorItem(self.data.od.outdoorid, "chat.messages", message, "push")

      // 从队员报名表中剔除
      var selfQuit = false
      let res = await this.data.od.quit(item.personid, selfQuit) // 这里面会发送微信消息
      this.setData({
        "od.members":res.members
      })
      console.log(res.members)
      self.flushMembers()

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
  async addOneMember() { 
    let res = await this.data.od.entry4Add(this.data.addMember)
    if(res.success) {
      this.setData({
        "od.addMembers":res.addMembers
      })
      this.flushAddMembers()
      this.setData({
        addMember: "" // 清空
      })
    } else if(res.failed) {
      wx.showModal({
        title: '无法增加',
        content: '增加附加队员失败，估计是有队员抢先报名导致名额已满，请核实！领队可先放宽人员限制，从而增加附加队员。',
      })
    }
  },

  // 删除 index位置的附加队员
  delAddMembers(index) {
    this.data.od.quit4Add(index)
    this.setData({
      "od.addMembers": this.data.od.addMembers,
      "od.members": this.data.od.members
    })
    this.flushAddMembers()
    this.flushMembers() // 有可能影响正式队员
  },

  // 创建 删除附加队员按钮
  flushAddMembers() {
    const self = this
    self.setData({
      entryFull: odtools.entryFull(self.data.od.limits, self.data.od.members, self.data.od.addMembers)
    })
    
    for (var i = 0; i < self.data.od.addMembers.length; i++) {
      let index = i // 还必须用let才行
      this["delAddMembers" + index] = () => {
        self.delAddMembers(index)
      }
    }
  }

})