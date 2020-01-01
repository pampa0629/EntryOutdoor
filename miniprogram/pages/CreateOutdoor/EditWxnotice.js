const app = getApp()
wx.cloud.init()
const db = wx.cloud.database()
const dbOutdoors = db.collection('Outdoors')
const dbPersons = db.collection('Persons')

const util = require('../../utils/util.js')
const template = require('../../utils/template.js')
const message = require('../../utils/message.js')
const promisify = require('../../utils/promisify.js')
const cloudfun = require('../../utils/cloudfun.js')


Page({

  data: {
    outdoorid: null,
    wxnotice: {},
    formids: [],
    hasModified: false,
    messageCount:0, // 领队可收到的报名消息个数
    size: app.globalData.setting.size, // 界面大小
  },

  onShow() {
    this.setData({
      size: app.globalData.setting.size
    })
  },

  async onLoad(options) {
    let formids = await template.clearPersonFormids(app.globalData.personid)
    this.setData({
      formids: formids
    })

    // 得到领队可接受的微信消息个数
    let res = await dbPersons.doc(app.globalData.personid).get()
    if(res.data.messageCount) {
      this.setData({
        messageCount: res.data.messageCount
      })
    }

    let pages = getCurrentPages() //获取当前页面js里面的pages里的所有信息。
    let data = pages[pages.length - 3].data
    this.setData({
      outdoorid: data.od.outdoorid,
    })

    let prevPage = pages[pages.length - 2]
    if (prevPage.data.limits.wxnotice) {
      this.setData({
        wxnotice: prevPage.data.limits.wxnotice,
      })
    } else {
      this.setData({
        wxnotice: message.getDefaultNotice(),
        hasModified: true,
      })
    }
  },

  onUnload: function() {
    console.log("onUnload()")
    this.save() // 自动保存
  },

  save(e) {
    console.log("save()")
    if (e)
      template.savePersonFormid(app.globalData.personid, e.detail.formId)
    
    if (this.data.hasModified) {
      let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
      let prevPage = pages[pages.length - 2];
      prevPage.setData({
        "limits.wxnotice": this.data.wxnotice,
      })
      let od = pages[pages.length - 3].data.od
      od.saveItem("limits.wxnotice")
      this.setData({
        hasModified: false
      })
    }
  },

  giveup(e) {
    console.log("giveup()")
    template.savePersonFormid(app.globalData.personid, e.detail.formId)
    this.data.hasModified = false
    wx.navigateBack({})
  },

  checkAccept() {
    const self = this;
    console.log(self.data.wxnotice.accept)
    self.setData({
      "wxnotice.accept": !self.data.wxnotice.accept,
      hasModified: true
    })
  },

  bindAddEntry(e) {
    console.log("bindAddEntry(e),",e)
    this.setData({
      "wxnotice.entryCount": e.detail,
      hasModified: true
    })
  },

  checkFullNotice() {
    const self = this;
    self.setData({
      "wxnotice.fullNotice": !self.data.wxnotice.fullNotice,
      hasModified: true
    })
    console.log(self.data.wxnotice.fullNotice)
  },

  addCount(e) {
    console.log(e.detail.formId)
    let formid = template.savePersonFormid(app.globalData.personid, e.detail.formId)
    this.data.formids.push(formid)
    this.setData({
      formids: this.data.formids
    })
  },

  async addMessageCount() {
    console.log("EditWxnotics.addMessageCount()")
    let res = await promisify.requestSubscribeMessage({
      tmplIds: ['1u0TixqNPN-E4yzzaK8LrUooofZAgGoK3_EwrrIG_Lg', // 收到队员报名通知
      ]})
    console.log("res: ", res)
    if (res.errMsg.indexOf("ok")) {
      this.setData({
        messageCount: this.data.messageCount + 1
      })
      await cloudfun.opPersonItem(app.globalData.personid, "messageCount", 1, "inc")
    }
  },

})