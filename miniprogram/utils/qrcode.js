// 把和lvyeorg对接的具体实现代码都放到这里来
const util = require('./util.js')
const app = getApp()
wx.cloud.init()
const db = wx.cloud.database()
const dbOutdoors = db.collection('Outdoors')

// 生成二维码，保存到本地，然后手动发朋友圈
const share2Circle = (outdoorid, title, isLeader) => {
  console.log(outdoorid)
  // 首先处理写本地相册的授权问题
  var message = "同意授权“保存到相册”才能保存二维码图片"
  util.authorize("writePhotosAlbum", message, res => {
    save2Album(outdoorid, title, isLeader)
  })
}

// 生成二维码，并存储到本地相册中
const save2Album = (outdoorid, title, isLeader) => {
  getCloudPath(outdoorid, (qrCode) => {
    console.log("QcCode: " + qrCode)
    wx.cloud.downloadFile({
      fileID: qrCode
    }).then(res => {
      console.log(res.tempFilePath)
      wx.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        fail(err) {
          console.log(err)
        },
        success(res) {
          console.log(res)
          console.log(isLeader)
          // 把活动信息拷贝到剪贴板中
          var message = ""
          if (isLeader) { // 领队的
            message = "一起出去走走吧，这个户外活动：“" + title + "”我是领队哦！\r\n点击图片，长按识别小程序码即可报名参加了。"
          } else { // 队员的
            message = "一起出去走走吧，这个户外活动不错：“" + title + "”！\r\n点击图片，长按识别小程序码即可报名参加了。"
          }
          console.log(message)
          wx.setClipboardData({
            data: message,
            fail(err) {
              console.log(err)
            },
            success(res) {
              wx.showModal({
                title: '准备就绪',
                content: '活动二维码保存到本地相册，活动信息也已复制到内存，直接去朋友圈发图片和文字即可',
                showCancel: false,
                confirmText: "马上就去"
              })
            }
          })
        }
      })
    })
  })
}

// 得到二维码图片的云存储路径，没有就先生成出来
const getCloudPath = (outdoorid, callback) => {
  // 先看看数据库中是否
  dbOutdoors.doc(outdoorid).get().then(res => {
    if (res.data.QcCode) {
      console.log("Outdoors is:" + res.data.QcCode)
      callback(res.data.QcCode)
    } else { 
      wx.cloud.callFunction({
        name: 'getAccessToken', // 云函数名称
      }).then(res => {
        console.log(res)
        wx.cloud.callFunction({
          name: 'createQrCode', // 云函数名称，返回二维码图片的云储存路径
          data: {
            outdoorid: outdoorid,
            access_token: JSON.parse(res.result).access_token,
          },
        }).then(res => {
          console.log("createQrCode: " + res)
          if (callback) {
            callback(res.result)
          }
        })
      })
    }
  })
}


module.exports = {
  share2Circle: share2Circle, 
  save2Album : save2Album,
  getCloudPath: getCloudPath,
}