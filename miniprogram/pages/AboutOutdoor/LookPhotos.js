const app = getApp()
const util = require('../../utils/util.js')
// const odtools = require('../../utils/odtools.js')
const outdoor = require('../../utils/outdoor.js')
// const message = require('../../utils/message.js')
const cloudfun = require('../../utils/cloudfun.js')
// const person = require('../../utils/person.js')
const promisify = require('../../utils/promisify.js')
const facetools = require('../../utils/facetools.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
const dbPersons = db.collection('Persons')
const _ = db.command

Page({

  data: {
    od: null,
    currentTab: 0, // 默认是“风景”
    screenHeight: 736, // 默认可用屏幕高度
    size: app.globalData.setting.size, // 界面大小

    isMember: true,
    landscapes: [], // 风景照（无人脸）
    multis: [], // 多人合影（达到参加活动人数的一半，或至少无人）
    mines: [], // 非合影，有自己的照片
    others: [], // 其他照片
  },

  async onLoad(options) {
    console.log("LookPhotos.onLoad()", options)
    var sysInfo = wx.getSystemInfoSync();
    this.setData({
      screenHeight: (sysInfo.screenHeight - sysInfo.statusBarHeight) * 0.8,
    })

    this.data.od = new outdoor.OD()
    await this.data.od.load(options.outdoorid)
    if (util.findIndex(this.data.od.members, "personid", app.globalData.personid)<0) {
      this.setData({
        isMember: false
      })
    }
    
    this.loadFacecodes()

    var div = Math.min(Math.max(this.data.od.members.length / 2,2), 5) // 活动人数的一半(至少2人），或者有5人，即认为是合影
    this.dividePhotos(this.data.od.photos, div)
  },

  onShow() {
    this.setData({
      size: app.globalData.setting.size
    })
  },

  // 给合影照片标注人名
  addMultiLabel(multi) {
    // multi.names = "摄影师：" + multi.owner.nickName+"；"
    multi.names = "从左到右为："
    for (var i in multi.faces) {
      var face = multi.faces[i]
      if (face.personid && face.nickName) {
        var maybe = facetools.getMaybe(face.dist) + "%"
        multi.names += face.nickName + "(" + maybe + ")，"
      } else {
        var num = parseInt(i)+1
        multi.names += "未知" + num + "，"
      }
    }
  },

  async divideOnePhoto(photo, div) {
    // console.log("LookPhotos.divideFaces()", photos, div)
    if (photo.facecount == -1 && !photo.error) { // 未识别，立即识别一下
      photo = await facetools.aiOdPhoto(this.data.od.outdoorid, photo, pid, 5) // 先识别，下次打开再展示
      divideOnePhoto(photo, div)
    } else if (photo.facecount == 0) { // 风景
      this.data.landscapes.push(photo)
    } else if (photo.facecount >= div) { // 合影，把人员昵称列出来
      this.addMultiLabel(photo)
      this.data.multis.push(photo)
    } else { // 有自己id在，算自己；不然算others
      if(util.findIndex(photo.faces, "personid", app.globalData.personid) >= 0) {
        this.data.mines.push(photo)
      } else { // 不是自己，则算others
        this.data.others.push(photo)
      }
    }
  },

  async dividePhotos(photos, div) {
    console.log("LookPhotos.divideFaces()", photos, div)
    for (var pid in photos) {
      await this.divideOnePhoto(photos[pid], div)
    }
    this.setData({
      landscapes: this.data.landscapes,
      multis: this.data.multis,
      mines: this.data.mines,
      others: this.data.others,
    })
    console.log("landscapes", this.data.landscapes)
    console.log("multis", this.data.multis)
    console.log("mines", this.data.mines)
    console.log("others", this.data.others)
  },

  async loadFacecodes() {
    console.log("LookPhotos.loadFacecodes()")
    let res = await dbPersons.doc(app.globalData.personid).get()
    this.data.facecodes = res.data.facecodes ? res.data.facecodes : {}
    this.setData({
      myFaceCount: Object.keys(this.data.facecodes).length
    })
    console.log("my facecodes length:", this.data.myFaceCount)
  },

  // 上传个人标准照片
  async uploadMyFace(e) {
    console.log("LookPhotos.uploadMyFace()")
    
    let resChoose = await promisify.chooseImage({
      count: 1, // 
      sizeType: ['original'], //['original', 'compressed'], // 必须用原图
      sourceType: ['album', 'camera'], // ['album', 'camera'], 
    })
    console.log("chooseImage:", resChoose)

    const item = resChoose.tempFiles[0]
    if (item.size < 5000) { // 图片不能小于5kb
      wx.showToast({
        title: '图片不能小于5KB',
      })
    } else {
      wx.showLoading({
        title: "正在上传图片"
      })
      console.log(item.path)
      let resUpload = await wx.cloud.uploadFile({
        cloudPath: util.buildPersonPhotoSrc(app.globalData.personid),
        filePath: item.path
      }) // 小程序临时文件路径
      console.log("fileID:", resUpload.fileID)
      const resTemp = await wx.cloud.getTempFileURL({
        fileList: [resUpload.fileID]
      })
      const tempUrl = resTemp.fileList[0].tempFileURL
      console.log("tempUrl:", tempUrl)

      wx.showLoading({
        title: "人脸识别中..."
      })
      let res = await facetools.aiOnePhoto(tempUrl, 5)
      wx.hideLoading()

      console.log("ai res:", res)
      if (res && res.length > 0 && res[1].length > 0) {
        const code = res[1][0]
        const id = facetools.calcCodeID(code)
        var facecode = {
          src: resUpload.fileID,
          code: code, 
          id: id, 
        }
        this.data.facecodes[id] = facecode
        this.setData({
          "myFaceCount": Object.keys(this.data.facecodes).length,
        })
        await cloudfun.opPersonItem(app.globalData.personid, "facecodes." + id, facecode, "")
        
        this.dealOthers(facecode.code)
        this.dealMultis(facecode.code)
      }
    }
  },

  dealOthers(mycode) {
    console.log("LookPhotos.dealOthers()")
    for(var i in this.data.others) {
      const other = this.data.others[i]
      var find = facetools.matchOnePhoto(this.data.od.outdoorid, other, mycode, app.globalData.personid, app.globalData.userInfo.nickName)
      if (find) {
        this.data.mines.push(other)
        this.data.others.splice(i,1)
      }
    }
    this.setData({
      mines: this.data.mines,
      others: this.data.others,
    })
    console.log("mines:", this.data.mines)
  },

  dealMultis(mycode) {
    console.log("LookPhotos.dealMultis()")
    for (var i in this.data.multis) {
      const multi = this.data.multis[i]
      var find = facetools.matchOnePhoto(this.data.od.outdoorid, multi, mycode, app.globalData.personid, app.globalData.userInfo.nickName)
      if (find) {
        this.addMultiLabel(multi)
      }
    }
    this.setData({
      multis: this.data.multis,
    })
    console.log("multis:", this.data.multis)
  },

  managerMyFaces(e) {
    console.log("LookPhotos.managerMyFaces()")
    wx.navigateTo({
      url: "../MyInfo/EditFaces",
    })
  },

  changeUnit(size) {
    console.log("LookPhotos.changeUnit()", size)
    const units = ["字节","KB","MB","GB"]
    var unit = ""
    for(var i in units) {
      unit = units[i]
      if(size>1024) {
        size = size/1024.0
      } else {
        break
      }
    }
    return {size:Math.floor(size), unit:unit}
  },

  async downPhotos(e, photos) {
    
    var size = 0
    for(var i in photos) {
      console.log("photos.id", photos[i].id)
      size += parseInt(photos[i].id)
      console.log("size", size)
    }
    const sizeUnit = this.changeUnit(size)
    console.log("sizeUnit", sizeUnit)
    let res = await promisify.showModal({
      title: "请确认下载",
      content: "准备下载的照片有" + photos.length + "个，大小共约为：" + sizeUnit.size + sizeUnit.unit
    })
    if (res.confirm) {
      var temps = []
      wx.showLoading({title: '照片下载中'})
      for (var id in photos) {
        const photo = photos[id]
        let resDown = await wx.cloud.downloadFile({
          fileID: photo.src
        })
        temps.push(resDown.tempFilePath)
      }
      wx.hideLoading()
      for (var i in temps) {
        promisify.saveImageToPhotosAlbum({
          filePath: temps[i],
        })
      }
    }
  },

  downLandscapes(e) {
    this.downPhotos(e, this.data.landscapes)
  },

  downMultis(e) {
    this.downPhotos(e, this.data.multis)
  },

  downMines(e) {
    this.downPhotos(e, this.data.mines)
  },

  onShareAppMessage: function(e) {
    const self = this
    if (self.data.od.outdoorid) { // 数据库里面有，才能分享出去
      return {
        title: self.data.od.title.whole,
        desc: '活动照片',
        path: 'pages/AboutOutdoor/LookPhotos?outdoorid=' + self.data.od.outdoorid
      }
    }
  },

  //滑动切换
  swiperTab: function(e) {
    this.setTab(e.detail.current)
  },

  //点击切换
  changeTab: function(e) {
    this.setTab(e.detail.index)
  },

  setTab(index) {
    if (index!= 0 && !this.data.isMember) {
      this.setData({
        currentTab: 0
      })
      wx.showModal({
        title: '不能查看',
        content: '非本次活动成员不能查看除风景外的照片',
      })
      return
    }
    if (this.data.currentTab != index) {
      this.setData({
        currentTab: index
      })
    }
  }


})