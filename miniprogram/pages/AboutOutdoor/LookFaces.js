const app = getApp()
const util = require('../../utils/util.js')
const odtools = require('../../utils/odtools.js')
const outdoor = require('../../utils/outdoor.js')
const template = require('../../utils/template.js')
const cloudfun = require('../../utils/cloudfun.js')
const person = require('../../utils/person.js')
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

    landscape: [], // 风景照
    group: [], // 合影
    myself: [], // 自己的
    others: [], // 他人个人照片，后续考虑
  },

  async onLoad(options) {
    console.log("LookFaces.onLoad()", options)
    var sysInfo = wx.getSystemInfoSync();
    this.setData({
      screenHeight: (sysInfo.screenHeight - sysInfo.statusBarHeight) * 0.8,
    })

    this.loadFacecodes()

    this.data.od = new outdoor.OD()
    await this.data.od.load(options.outdoorid)
    // isLeader
    // isMember
    await facetools.matchOdFaces(this.data.od.outdoorid, this.data.od.faces)

    var groupDiv = Math.min(this.data.od.members.length / 2, 5) // 群人数的一半，或者有5人，即认为是合影
    this.divideFaces(this.data.od.faces, groupDiv)

  },

  divideFaces(faces, groupDiv) {
    console.log("LookFaces.divideFaces()", faces, groupDiv)
    for (var id in faces) {
      const face = faces[id]
      if (face.count == -1 && !face.error) { // 未识别，立即识别一下
        facetools.aiOdFace(this.data.od.outdoorid, face, id, 5) // 先识别，下次打开再展示
      } else if (face.count == 0) { // 风景
        this.data.landscape.push(face)
      } else if (face.count >= groupDiv) { // 合影，把人员昵称列出来
        if(face.persons) {
          face.names = "合影成员有："
          for (var i in face.persons) {
            face.names += face.persons[i].nickName+", "
          }
        }
        this.data.group.push(face)
      } else { // 有自己id在，算自己；不然算others
        var isSelf = false
        if (face.persons) {
          for (var i in face.persons) {
            if (face.persons[i].personid == app.globalData.personid) {
              isSelf = true
              break
            }
          }
        }
        if (isSelf) {
          this.data.myself.push(face)
        } else { // 不是自己，则算others
          this.data.others.push(face)
        }
      }
    }
    this.setData({
      landscape: this.data.landscape,
      group: this.data.group,
      myself: this.data.myself,
      others: this.data.others,
    })
    console.log("landscape", this.data.landscape)
    console.log("group", this.data.group)
    console.log("myself", this.data.myself)
    console.log("others", this.data.others)
  },

  async loadFacecodes() {
    console.log("LookFaces.loadFacecodes()")
    let res = await dbPersons.doc(app.globalData.personid).get()
    this.data.facecodes = res.data.facecodes ? res.data.facecodes : {}
    this.setData({
      myFaceCount: Object.keys(this.data.facecodes).length
    })
    console.log("my facecodes length:", this.data.myFaceCount)
  },

  // 上传个人标准照片
  async uploadMyFace(e) {
    console.log("LookFaces.uploadMyFace()")
    template.savePersonFormid(app.globalData.personid, e.detail.formId)

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
      let res = await facetools.aiOneFace(tempUrl, 5)
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
        
        this.dealOther(facecode.code, this.data.others)
      }
    }
  },

  dealOther(mycode, others) {
    console.log("LookFaces.dealOther()")
    const self = this
    others.forEach((item, index) => { // 每张照片
      for (var i in item.codes) { // 每个人像
        var dist = facetools.getDist(item.codes[i], mycode)
        if (dist < 1.0) {
          if(!item.persons) {
            item.persons = {}
          }
          if (item.persons[i] && item.persons[i].dist < dist) {
            // 如果已有更好的，则无需更新
          } else { // 否则就要更新
            item.persons[i] = {
              dist: dist,
              personid: app.globalData.personid,
              nickName: app.globalData.userInfo.nickName
            }
          }
          // 存起来
          let name = "faces." + item.id + ".persons." + i
          cloudfun.opOutdoorItem(this.data.od.outdoorid, name, item.persons[i], "")
          self.data.myself.push(item)
          self.setData({
            myself: self.data.myself
          })
          console.log("myself:", self.data.myself)
        }
      }
    })
  },

  onShareAppMessage: function(e) {
    const self = this
    if (self.data.od.outdoorid) { // 数据库里面有，才能分享出去
      return {
        title: self.data.od.title.whole,
        desc: '活动照片',
        path: 'pages/AboutOutdoor/LookFaces?outdoorid=' + self.data.od.outdoorid
      }
    }
  },

  //滑动切换
  swiperTab: function(e) {
    this.setData({
      currentTab: e.detail.current
    })
  },

  //点击切换
  changeTab: function(e) {
    if (this.data.currentTab != e.detail.index) {
      this.setData({
        currentTab: e.detail.index
      })
    }
  },


})