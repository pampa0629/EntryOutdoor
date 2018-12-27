const app = getApp()
wx.cloud.init()
const db = wx.cloud.database()
const dbOutdoors = db.collection('Outdoors')
const dbPersons = db.collection('Persons')

const util = require('../../utils/util.js')
const template = require('../../utils/template.js')

Page({

  data: {
    outdoorid:null,
    wxnotice:{}, 
    formids:[],
    hasModified: false, 
  },

  onLoad: function (options) {
    const self = this;
    let pages = getCurrentPages() //获取当前页面js里面的pages里的所有信息。
    let data = pages[pages.length - 3].data
    self.setData({
      outdoorid: data.outdoorid,
    })

    let prevPage = pages[pages.length - 2]
    if (prevPage.data.limits.wxnotice){
      self.setData({
        wxnotice: prevPage.data.limits.wxnotice,
      })
    } else {
      self.setData({
        wxnotice: template.getDefaultNotice(),
        hasModified: true, 
      })
    }

    dbPersons.doc(app.globalData.personid).get().then(res => {
      if (res.data.formids) {
        self.setData({
          formids: res.data.formids
        })
      }
    })
    console.log(self.data)
  },

  onUnload: function () {
    const self = this;
    console.log(self.data)
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    prevPage.setData({
      "limits.wxnotice": self.data.wxnotice,
      hasModified: self.data.hasModified,
    })
  },

  checkAccept(){
    const self = this;
    console.log(self.data.wxnotice.accept)
    self.setData({
      "wxnotice.accept": !self.data.wxnotice.accept,
      hasModified: true
    })
  }, 

  bindAddEntry(e){
    this.setData({
      "wxnotice.entryCount": e.detail,
      hasModified: true
    })
    console.log(this.data.wxnotice.entryCount)
  },

  checkFullNotice(){
    const self = this;
    self.setData({
      "wxnotice.fullNotice": !self.data.wxnotice.fullNotice,
      hasModified: true
    })
    console.log(self.data.wxnotice.fullNotice)
  },

  addCount(e) { 
    console.log(e.detail.formId)
    const self = this
    template.savePersonFormid(app.globalData.personid, e.detail.formId, formid=>{
      self.data.formids.push(formid)
      self.setData({
        formids: self.data.formids
      })
    })
  },

})