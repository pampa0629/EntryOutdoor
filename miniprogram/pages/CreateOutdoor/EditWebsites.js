const app = getApp()
const util = require('../../utils/util.js')
const cloudfun = require('../../utils/cloudfun.js')
// const template = require('../../utils/template.js')
const lvyeorg = require('../../utils/lvyeorg.js')
const outdoor = require('../../utils/outdoor.js')
const odtools = require('../../utils/odtools.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')

Page({ 
 
  data: {
    od: null,
    size: app.globalData.setting.size, // 界面大小
    
    lvyeorgInfo: null, // 绿野org账户信息
    forum: {}, // 选择的绿野论坛{name, id}
    //  67: 周末户外活动; 90：周末休闲活动； 91:远期自助旅游; 93：技术小组
    Forums: [{
      name: "周末户外活动",
      label:"强度>1.0，或重装负重",
      id: "67"
    }, {
      name: "周末休闲活动",
      label: "强度<=1.0，或休闲类型",
      id: "90"
    }, {
        name: "户外亲子",
        label: "带小孩参与的亲子类活动",
        id: "120"
    }, {
      name: "远期自助旅游",
      label: "活动时间在30天之后",
      id: "91"
    }, {
      name: "技术小组",
      label: "测试类活动",
      id: "93"
    }]
  },

  onShow() {
    this.setData({
      size: app.globalData.setting.size
    })
  },

  onLoad: function(options) {
    console.log("onLoad()")
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 3];
    let od = prevPage.data.od
    this.setData({
      od: od,
      lvyeorgInfo: app.globalData.lvyeorgInfo
    })
 
    var fid = this.data.od.websites.lvyeorg.fid
    if (!fid) { // 选择合适的论坛
      console.log("limits.isTest:", this.data.od.limits.isTest)
      fid = lvyeorg.chooseForum(this.data.od.title, this.data.od.limits.isTest)
    }
    this.flushForm(fid.toString())

    if (this.data.od.websites.lvyeorg.tid) {
      this.flushUrl(this.data.od.websites.lvyeorg.tid)
    }

    console.log(this.data)
  },

  flushUrl(tid) {
    this.setData({
      orgUrl: "http://www.lvye.org/forum.php?mod=viewthread&tid=" + tid
    })
  }, 

  flushForm(id) {
    console.log("flushForm(),id:", id)
    this.data.forum.id = id
    this.data.forum.name = util.findValue(this.data.Forums, "id", this.data.forum.id).name
    this.setData({
      forum: this.data.forum, // 防止对象引用
    })
    console.log(this.data.forum)
  },

  clickForum(e) {
    console.log("clickForum(),e:", e)
    this.flushForm(e.target.dataset.name)
  },

  onUnload: function() {

  },

  async connetLvyeorg(e) {
    // template.savePersonFormid(app.globalData.personid, e.detail.formId, null)
    let tid = await this.data.od.push2org(this.data.forum.id)
    wx.showModal({
      title: '同步绿野org成功',
      content:"网址已拷贝到内存中，可打开浏览器核实信息",
      showCancel:false, 
    })
    this.copyLvyeUrl()
    this.setData({
      "od.websites": this.data.od.websites, 
    })
    this.flushUrl(tid)
  },

  disconnetLvyeorg(e) {
    const self = this
    // template.savePersonFormid(app.globalData.personid, e.detail.formId, null)
    wx.showModal({
      title: '确认断开？',
      content: '断开将导致后续本活动所有信息，包括报名、活动内容修改等都无法同步到原帖子上；再同步只能发布新帖。请确认',
      success(res) {
        if (res.confirm) {
          console.log('用户点击确定')
          self.setData({
            "od.websites" : odtools.getDefaultWebsites()
          })
          self.flushForm(lvyeorg.chooseForum(self.data.od.title, self.data.od.limits.isTest))
        } else if (res.cancel) {
          console.log('用户点击取消')
        }
      }
    })
  },

  copyLvyeUrl() {
    console.log("copyLvyeUrl()")
    const self = this
    wx.setClipboardData({
      data: self.data.orgUrl,
    })
  },

  async tapPostWaitings() {
    console.log("tapPostWaitings()")
    await cloudfun.opOutdoorItem(this.data.od.outdoorid, "websites.lvyeorg.posting", false, "")
    await this.data.od.postWaitings()
    this.setData({
      "od.websites": this.data.od.websites,
    }) 
  }, 
  
  checkAllowSiteEntry: function(e) {
    console.log(e)
    this.setData({ 
      "od.websites.lvyeorg.allowSiteEntry": !this.data.od.websites.lvyeorg.allowSiteEntry,
    })
    this.data.od.saveItem("websites")
  },

  tapOrgHall: function () {
    var url = 'pages/detail/detail?tid=' + this.data.od.websites.lvyeorg.tid
    wx.navigateToMiniProgram({
      appId: 'wx1599b7c8d1e2b4d4', // 要跳转的小程序的appid
      path: url, // 跳转的目标页面
      success(res) {
        // 打开成功  
      }
    })
  },

})