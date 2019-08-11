const QRCode = require('../../libs/weapp-qrcode.js')
const util = require('../../utils/util.js')

Page({

  data: {
    route: {}, // 活动路线，由多个站点（stop）组成
    qrcodes: [], // 轨迹app二维码
    fqrcodes: [], // 轨迹文件二维码
    furls:[], // 轨迹文件临时下载url
  },

  onLoad: function(options) {
    console.log("onLoad()")
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    this.setData({
      route: prevPage.data.od.route,
    })
    this.data.route.trackSites = this.data.route.trackSites ? this.data.route.trackSites:[]
    this.data.route.trackFiles = this.data.route.trackFiles ? this.data.route.trackFiles : []
    this.dealSites()
    this.dealFiles()
  },

  dealSites() {
    console.log("dealSites()")
    const self = this
    self.data.route.trackSites.forEach((item, index) => {
      let i = index
      this["copyoutUrl" + i] = () => {
        this.copyoutUrl(i)
      }
      this["saveQrcode" + i] = () => {
        this.saveQrcode(i)
      }
      if (!self.data.route.trackSites[i].qrcode) {
        self.data.route.trackSites[i].qrcode = self.data.route.trackSites[i].url
      }
      self.data.qrcodes[i] = new QRCode('canvas' + i, {
        text: self.data.route.trackSites[i].qrcode,
        width: 128,
        height: 128,
        colorDark: "#1CA4FC",
        colorLight: "white",
        correctLevel: QRCode.CorrectLevel.H,
      })
      console.log(self.data.route.trackSites[i], self.data.qrcodes[i])
    })
  },

  dealFiles() {
    console.log("dealFiles()")
    const self = this
    console.log(self.data.route.trackFiles)
  
    self.data.route.trackFiles.forEach((item, index) => {
      let i = index; // 还必须用let才行 
      this["copyFileUrl" + i] = () => {
        this.copyFileUrl(i)
      }
      this["saveFileQrcode" + i] = () => {
        this.saveFileQrcode(i)
      }
      this.getFileUrl(i, url => {
        console.log("url: " + url)
        self.data.furls[i] = url
        self.data.fqrcodes[i] = new QRCode('fcanvas' + i, {
          text: url,
          width: 128,
          height: 128,
          colorDark: "#1CA4FC",
          colorLight: "white",
          correctLevel: QRCode.CorrectLevel.H,
        })
      })
    })
  },

  copyFileUrl(index, callback) {
    const self = this
    wx.setClipboardData({
      data: self.data.furls[index],
      success(res) {
        wx.showModal({
          title: '复制链接成功',
          content: "下载链接已经复制到内存中，请打开任意浏览器粘贴后下载该轨迹文件",
          showCancel: false,
        })
      }
    })
  },

  getFileUrl(index, callback) {
    const self = this
    console.log("copyFileUrl(index):" + index)
    const track = self.data.route.trackFiles[index]
    console.log(track)

    wx.cloud.getTempFileURL({
      fileList: [track.src]
    }).then(res => {
      console.log(res.fileList)
      if (res.fileList.length == 1) {
        const url = res.fileList[0].tempFileURL
        console.log("url:"+url)
        if (callback) {
          callback(url)
        }
      }
    })
  },

  saveFileQrcode(index) {
    console.log("saveFileQrcode()")
    console.log(index)
    const self = this
    var message = "同意授权“保存到相册”才能保存二维码图片"
    util.authorize("writePhotosAlbum", message, res => {
      self.data.fqrcodes[index].exportImage(function (path) {
        wx.saveImageToPhotosAlbum({
          filePath: path,
        })
      })
    })

  },

  copyoutUrl(index) {
    console.log("copyoutUrl")
    console.log(index)
    const self = this
    wx.setClipboardData({
      data: self.data.route.trackSites[index].url,
      success: function(res) {
        wx.showToast({
          title: '已复制',
        })
      }
    })
  },

  saveQrcode(index) {
    console.log("saveQrcode")
    console.log(index)
    const self = this
    var message = "同意授权“保存到相册”才能保存二维码图片"
    util.authorize("writePhotosAlbum", message, res => {
      self.data.qrcodes[index].exportImage(function(path) {
        wx.saveImageToPhotosAlbum({
          filePath: path,
        })
      })
    })
  },

})