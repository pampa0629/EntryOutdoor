const cloudfun = require('../../utils/cloudfun.js')
const util = require('../../utils/util.js')
const app = getApp()

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')

Page({

  data: {
    isLeader: false,
    chat: {
      messages: [],
      qrcode: null
    },
  },

  onLoad: function(options) {
    console.log(options)
    const self = this
    self.data.outdoorid = options.outdoorid
    if (options.isLeader == "true") {
      self.setData({
        isLeader: true,
      })
    }
    dbOutdoors.doc(self.data.outdoorid).get().then(res => {
      if (res.data.chat) {
        self.setData({
          chat: res.data.chat,
        })
      }
    })
  },

  onUnload: function() {

  },

  uploadQrcode() {
    var self = this;
    wx.chooseImage({
      count: 1, // 
      sizeType: ['original'], //['original', 'compressed'],   
      sourceType: ['album'], // ['album', 'camera'], // 当前只能相册选取
      success: function(resChoose) {
        resChoose.tempFiles.forEach((item, index) => {
          console.log(item.path)
          wx.cloud.uploadFile({
            cloudPath: util.buildChatQrcode(self.data.outdoorid),
            filePath: item.path, // 小程序临时文件路径
          }).then(resUpload => {
            dbOutdoors.doc(self.data.outdoorid).get().then(res => {
              if (res.data.chat) {
                self.setData({
                  chat: res.data.chat,
                })
              }
              var oldpath = self.data.chat.qrcode
              self.setData({
                "chat.qrcode": resUpload.fileID,
              })
              self.data.chat.messages.push({
                who: app.globalData.userInfo.nickName,
                msg: "@所有人 领队设置了活动专用微信群，请在留言页面右上角点击查看并扫描入群。谢谢！",
                personid: app.globalData.personid
              })
              if (oldpath) {
                wx.cloud.deleteFile({
                  fileList: [oldpath]
                })
              }
              cloudfun.updateOutdoorChat(self.data.outdoorid, self.data.chat)
            })
          })
        })
      }
    })
  },

  saveQrcode() {
    const self = this
    var message = "同意授权“保存到相册”才能保存二维码图片"
    util.authorize("writePhotosAlbum", message, res => {
      wx.cloud.downloadFile({
        fileID: self.data.chat.qrcode
      }).then(res => {
        console.log(res.tempFilePath)
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success(res) {
            wx.showToast({
              title: '已保存到相册',
            })
          }
        })
      })
    })
  },

})