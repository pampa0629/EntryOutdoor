// pages/CreateOutdoor/UploadPics.js
const util = require('../../utils/util.js')
wx.cloud.init()

Page({

  data: {
    pics: [], // {src:string} 云存储路径
    outdoorid:null, // 活动id
    hasModified: false,
  },

  onLoad: function (options) {
    console.log(options)
    if (options.outdoorid){
      this.setData({
        outdoorid: options.outdoorid,
      })
    }

    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    this.setData({
      pics: prevPage.data.brief.pics,
      hasModified: prevPage.data.hasModified,
    })

    console.log(this.data.outdoorid)
    console.log(this.data.pics)
  },

  onUnload: function () {
    const self = this
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    prevPage.setData({
      "brief.pics": self.data.pics,
      hasModified: self.data.hasModified,
    })
  },

  // 增加照片
  addPic: function (e) {
    var self = this;
    var length = self.data.pics.length
    wx.chooseImage({
      count: 3 - length, // 
      sizeType: ['compressed'], //['original', 'compressed'], // 当前只提供压缩图  
      sourceType: ['album'], // ['album', 'camera'], // 当前只能相册选取
      success: function (resChoose) {
        resChoose.tempFiles.forEach((item, index) => {
          if (item.size > 512000) { // 控制每张图片不能超过500kb
            wx.showToast({
              title: '图片不能大于500KB',
            })
          } else {
            wx.showLoading({
              icon: "loading",
              title: "正在上传图片"
            })
            console.log(item.path)
            wx.cloud.uploadFile({
              cloudPath: util.buildPicSrc(self.data.outdoorid, index + length),
              filePath: item.path, // 小程序临时文件路径
            }).then(resUpload => {
              //console.log("CreateOutdoor.js in addPic fun, res of uploadFile is:" + JSON.stringify(resUpload, null, 2))
              self.data.pics.push({
                src: resUpload.fileID
              })
              self.setData({
                "pics": self.data.pics,
                hasModified: true,
              })
              console.log("CreateOutdoor.js in addPic fun, pics is:" + JSON.stringify(self.data.pics, null, 2))
            }).catch(err => {
              console.log("CreateOutdoor.js in addPic fun, uploadFile err is:" + JSON.stringify(err, null, 2))
            })
            wx.hideLoading()
          }
        })
      }
    })
  },

  // 删除照片
  deletePic: function (e) {
    console.log("CreateOutdoor.js in deletePic fun, pics count is:" + this.data.pics.length)
    // 试着删除文件，要删不掉，则是用模板创建的活动，图片是别人的
    var file = this.data.pics[this.data.pics.length - 1].src;
    wx.cloud.deleteFile({
      fileList: [file]
    }).then(res => {
      console.log("CreateOutdoor.js in deletePic fun, del pic ok: " + JSON.stringify(res, null, 2))
    }).catch(err => {
      console.log("CreateOutdoor.js in deletePic fun, del pic err: " + JSON.stringify(err, null, 2))
    })

    this.data.pics.pop(); // 去掉最后一个
    this.setData({
      pics: this.data.pics,
      hasModified: true,
    })
  },

})