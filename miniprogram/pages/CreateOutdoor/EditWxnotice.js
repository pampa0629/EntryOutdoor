wx.cloud.init()
const db = wx.cloud.database()
const dbOutdoors = db.collection('Outdoors')

const util = require('../../utils/util.js')
const template = require('../../utils/template.js')

Page({

  data: {
    outdoorid:null,
    wxnotice:null, 
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
      dbOutdoors.doc(self.data.outdoorid).get().then(res => {
        self.setData({
          "wxnotice.formids": res.data.limits.wxnotice.formids
        })
      })
    } else {
      self.setData({
        wxnotice: template.getDefaultNotice(),
      })
    }
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
    console.log(this.data.wxnotice.entryCount)
  },

  checkFullNotice(){
    const self = this;
    console.log(self.data.wxnotice.fullNotice)
    self.setData({
      "wxnotice.fullNotice": !self.data.wxnotice.fullNotice,
      hasModified: true
    })
  },

  addCount(e){
    const self = this
    template.saveOutdoorFormid(self.data.outdoorid, e.detail.formId)
    var formid = template.buildOneFormid(e.detail.formId)
    if (formid){
      self.data.wxnotice.formids.push(formid)
      self.setData({
        "wxnotice.formids": self.data.wxnotice.formids
      })
    }
    console.log(self.data.wxnotice.formids.length)
  },

})