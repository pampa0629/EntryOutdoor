const app = getApp()
const util = require('../../utils/util.js')
const qrcode = require('../../utils/qrcode.js')
const odtools = require('../../utils/odtools.js')
const template = require('../../utils/template.js')
const cloudfun = require('../../utils/cloudfun.js')
const promisify = require('../../utils/promisify.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
const dbPersons = db.collection('Persons')
const _ = db.command

Page({

  data: { 
    outdoorid:null, 
    title:"", 
    
    isCFO:false, 
    pay:{}, 

    mine:{num:1, screen:""},
    size: app.globalData.setting.size, // 界面大小
  },

  onLoad: function (options) {
    wx.showShareMenu({
      withShareTicket: true
    })
    
    console.log(options)
    const self = this
    // 设置mine
    // self.data.mine.personid = app.globalData.personid
    self.data.mine.nickName = app.globalData.userInfo.nickName
    
    self.data.outdoorid = options.outdoorid
    dbOutdoors.doc(self.data.outdoorid).get().then(res => {
      self.setData({
        pay: res.data.pay,
        title: res.data.title.whole,
      })
      const results = res.data.pay.results
      console.log(results)
      if (results && results[app.globalData.personid]) {
        self.setData({
          mine: results[app.globalData.personid],
        })
      }

      if (self.data.pay.cfo.personid == app.globalData.personid) {
        self.setData({
          isCFO: true,
        })
      }
    }) 
  },

  onShow() {
    this.setData({
      size: app.globalData.setting.size
    })
  },

  clickCFO() {
    wx.navigateTo({
      url: './CfoOutdoor?outdoorid='+this.data.outdoorid, 
    })
  }, 

  back2Outdoor() {
    wx.navigateTo({
      url: "../EntryOutdoor/EntryOutdoor?outdoorid=" + this.data.outdoorid
    })
  },

  onUnload: function () {

  },

  async downloadQrcode() {
    const self = this
    var message = "同意授权“保存到相册”才能保存收款二维码；也可自行截屏保存"
    await util.authorize("writePhotosAlbum", message)
    let res = await wx.cloud.downloadFile({
      fileID: self.data.pay.qrcode
    })
    console.log(res.tempFilePath)
    await promisify.saveImageToPhotosAlbum({
      filePath: res.tempFilePath})
    wx.showToast({
      title: '已保存',
    })
    
  },

  bindNum(e) {
    this.setData({
      "mine.num": e.detail,
    })
  },

  updateScreen(){
    const self = this;
    wx.chooseImage({
      count: 1, // 
      sizeType: ['compressed'], //['original', 'compressed'],   
      sourceType: ['album'], // ['album', 'camera'], // 当前只能相册选取
      success: function (resChoose) {
        resChoose.tempFiles.forEach((item, index) => {
          console.log(item.path)
          wx.cloud.uploadFile({
            cloudPath: util.buildPayResult(self.data.outdoorid, app.globalData.personid),
            filePath: item.path, // 小程序临时文件路径
          }).then(resUpload => {
            var oldpath = self.data.mine.screen
            self.setData({
              "mine.screen": resUpload.fileID,
            })
            // 写入mine到数据库中
            odtools.setPayMine(self.data.outdoorid, app.globalData.personid, self.data.mine)
            if (oldpath) { // 删除原来的二维码文件
              wx.cloud.deleteFile({
                fileList: [oldpath]
              })
            }
          })
        })
      }
    })
  },

  onShareAppMessage() {
    return {
      title: '活动收款',
      desc: self.data.title.whole,
      path: 'pages/AboutOutdoor/PayOutdoor?outdoorid=' + self.data.outdoorid,
    }
  }

})