const QRCode = require('../../libs/weapp-qrcode.js')
const util = require('../../utils/util.js')

Page({

  data: { 
    route: {}, // 活动路线，由多个站点（stop）组成
    qrcodes:[], // 轨迹二维码
  },
 
  onLoad: function(options) {
    console.log("onLoad")
    const self = this;
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    self.setData({
      route: prevPage.data.od.route,
    })

    if (self.data.route.trackSites) {
      for (var i = 0; i < self.data.route.trackSites.length; i++) {
        let index = i
        this["copyoutUrl" + index] = () => {
          this.copyoutUrl(index) 
        }
        this["saveQrcode" + index] = () => {
          this.saveQrcode(index)
        }
        self.data.qrcodes[i] = new QRCode('canvas'+i, {
          text: self.data.route.trackSites[i].qrcode,
          width: 128,
          height: 128,
          colorDark: "#1CA4FC",
          colorLight: "white",
          correctLevel: QRCode.CorrectLevel.H,
        });
      }
    }

    if (self.data.route && self.data.route.trackFiles) {
      for (var i = 0; i < self.data.route.trackFiles.length; i++) {
        let j = i; // 还必须用let才行
        this["downloadTrackFile" + j] = () => {
          this.downloadTrackFile(j)
        }
      }
    }
  },

  downloadTrackFile(index) {
    const self = this
    console.log("downloadTrackFile(index):"+index)
    const track = self.data.route.trackFiles[index]
    console.log(track)

    wx.cloud.getTempFileURL({
      fileList: [track.src]
    }).then(res => {
      console.log(res.fileList)
      if(res.fileList.length==1) {
        wx.setClipboardData({
          data: res.fileList[0].tempFileURL,
          success(res) {
            wx.showModal({
              title: '获取链接成功',
              content: "下载链接已经拷贝到内存中，请打开任意浏览器复制链接下载该轨迹文件",
              showCancel: false,
            })
          }
        })
      }
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
      self.data.qrcodes[index].exportImage(function (path) {
        wx.saveImageToPhotosAlbum({
          filePath: path,
        })
      })
    })
    
  },

})