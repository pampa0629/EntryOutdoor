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
      route: prevPage.data.route,
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

    wx.cloud.downloadFile({
      fileID: track.src, // 文件 ID
      success: res => {
        // 返回临时文件路径
        console.log(res.tempFilePath)
        
        const fs = wx.getFileSystemManager()
        fs.saveFile({
          tempFilePath: res.tempFilePath,
          success: res => { // 变态的微信，限制太死
            console.log("savedFilePath:", res.savedFilePath)
            var newPath = wx.env.USER_DATA_PATH + "/" + track.name
            console.log(newPath)
            fs.rename({ // 这里只能先重命名，再提示队员从指定路径找到对应的轨迹文件了 
              oldPath: res.savedFilePath,
              newPath: newPath,
              success:res=>{
                console.log("rename result:")
                console.log(res)
                const path = "/tencent/MicroMsg/wxanewfiles/9fee8ed4ef44c9b804a4f3cdcbe733b0/" // 手机路径
                wx.setClipboardData({
                  data: path,
                  success(res) {
                    wx.showModal({
                      title: '下载成功',
                      content: '由于微信限制，文件只能下载到微信系统目录下，请到：' + path + " 目录下查找该轨迹文件。为方便定位，该目录已经复制到内存中。",
                      showCancel: false,
                    })
                  }
                })
              },
              fail: error => console.log(error),
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