// pages/MyInfo/ModifyInfo.js
const app = getApp()
wx.cloud.init()
const db = wx.cloud.database({})
const dbPersons = db.collection('Persons')
const _ = db.command

const util = require('../../utils/util.js')
const person = require('../../utils/person.js')
const crypto = require('../../utils/crypto.js')

let interstitialAd = null // 插屏广告

Page({ 
  data: { 
    userInfo: {
      nickName: null,  
      gender: null,
      phone: null
    },
    Genders: ["GG", "MM"], // 性别选项; //性别 0:未知、1:男、2:女
    hasModified: false, // 是否修改了

    phoneErrMsg: "", // 电话号码输入错误提示 ==手机号格式错误
    nickErrMsg: "", // 昵称必须唯一
    oldNickName: "", // 只有修改了，才进行昵称的唯一性判断

    showEmergency: false, // 是否显示紧急联系信息
    emergency: { // 紧急联系方式                                                                               
      contact: {
        name: "", 
        phone1: "",
        phone2: "",
      },
      self: {
        trueName: "",
        id: "",
        photos: [],
      },
    },
  },

  onLoad: function(options) {
    const self = this;
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    self.setData({
      userInfo: prevPage.data.userInfo,
      password: wx.getStorageSync("EmergencyPassword")
    })
    console.log("password: ", this.data.password)
    self.data.oldNickName = self.data.userInfo.nickName

    // dbPersons.doc(app.globalData.personid).get().then(res => {
    //   if (res.data.emergency) {
    //     console.log(res.data.emergency)
    //     self.setData({ // 解密
    //       emergency: crypto.decrypt(res.data.emergency, self.data.password)
    //     })
    //     console.log(self.data.emergency)
    //   }
    // })
    
    wx.showShareMenu({
      withShareTicket: true
    })
    this.addAd()
  },

  // 添加广告
  addAd() {
    if (wx.createInterstitialAd) {
      interstitialAd = wx.createInterstitialAd({
        adUnitId: 'adunit-83d9b67d53f57ebe'
      })
      interstitialAd.onLoad(() => {
        console.log('ad onLoad event emit')
      })
      interstitialAd.onError((err) => {
        console.log('ad onError event emit', err)
      })
      interstitialAd.onClose((res) => {
        console.log('ad onClose event emit', res)
      })
    }
  },

  showAd() {
    console.log('showAd()')
    console.log('interstitialAd: ', interstitialAd)
    // 每次进入显示广告
    if (interstitialAd) {
      interstitialAd.show()
        .then(res => {
          console.log(res)
        }).catch(err => {
          console.error(err)
        })
    }
  },

  onUnload() {
    console.log("onUnload")
    const self = this;
    if (self.data.hasModified) {
      app.globalData.userInfo = self.data.userInfo
      // 修改“我的信息”页面
      let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
      let prevPage = pages[pages.length - 2];
      prevPage.setData({
        userInfo: self.data.userInfo,
      })

      console.log(self.data.emergency)
      // 写入数据库
      dbPersons.doc(app.globalData.personid).update({
        data: {
          userInfo: self.data.userInfo,
        }
      })
      // self.saveEmergency()
    }
  },
 
  changeNickname: function(e) {
    console.log(e)
    const self = this
    person.checkNickname(e.detail,app.globalData.personid, (errMsg,result)=>{
      console.log("change name:" + result + ", " + errMsg)
      if(!result) { // 不成功，强制回到最后一个合法的名字
        e.detail = self.data.oldNickName
      } 
      self.setData({
        hasModified: true,
        "userInfo.nickName": e.detail,
        userInfo: self.data.userInfo,
        nickErrMsg: errMsg,
      })
      console.log("old name:" + self.data.oldNickName)
    })
  },

  changePhone: function(e) {
    console.log(e)
    const self = this
    self.setData({
      hasModified: true,
      "userInfo.phone": e.detail.toString(), // 转为字符串
    })
    self.setData({
      phoneErrMsg: self.data.userInfo.phone.length==11? "":"请输入11位手机号码",
    })
  },

  clickGender(e) {
    console.log(e)
    this.setData({
      "userInfo.gender": e.target.dataset.name,
      hasModified: true,
    })
    this.showAd()
  },

  changeGender: function(e) {
    console.log(e)
    const self = this
    self.setData({
      "userInfo.gender": e.detail,
      hasModified: true,
    })
    this.showAd()
  },

  changeEmergency(e) {
    this.setData({
      showEmergency: e.detail,
    })
  },

  changeContactName(e) {
    this.setData({
      "emergency.contact.name": e.detail,
      hasModified: true,
    })
  },

  changeContactPhone1(e) {
    this.setData({
      "emergency.contact.phone1": e.detail,
      hasModified: true,
    })
  },

  changeContactPhone2(e) {
    this.setData({
      "emergency.contact.phone2": e.detail,
      hasModified: true,
    })
  },

  changeSelfName(e) {
    this.setData({
      "emergency.self.trueName": e.detail,
      hasModified: true,
    })
    console.log(this.data.emergency)
  },

  changeSelfID(e) {
    this.setData({
      "emergency.self.id": e.detail,
      hasModified: true,
    })
  },

  changeEntrust(e){
    this.setData({
      "emergency.entrust.open":e.detail,
      hasModified: true,
    })
    this.saveEmergency()
  },

  changeStartDate(e){
    console.log(e)
    this.setData({
      "emergency.entrust.start": e.detail.value,
      hasModified: true,
    })
  },

  changeEndDate(e) {
    this.setData({
      "emergency.entrust.end": e.detail.value,
      hasModified: true,
    })
  },

  // onShareAppMessage: function (options) {
  //   console.log("onShareAppMessage")
  //   const self = this;
  //   self.saveEmergency()
  //   // 给密码也加个密，用appid作为密码
  //   var key = crypto.encrypt(self.data.password, "wx20edd5723fb67799")
  //   return {
  //     title: app.globalData.userInfo.nickName,
  //     desc: '授权查看紧急联系信息',
  //     path: 'pages/MyInfo/LookEmergency?personid=' + app.globalData.personid + "&password="+key,
  //   }
  // },

  // 加密后保存起来
  saveEmergency() {
    console.log("saveEmergency")
    const self = this
    dbPersons.doc(app.globalData.personid).update({
      data: { // 加密
        "emergency": _.set(crypto.encrypt(self.data.emergency, self.data.password)),
      }
    })
  }, 

  changePassword(e){
    console.log(e)
    const self = this
    self.setData({
      password:e.detail
    })
    wx.setStorageSync("EmergencyPassword", self.data.password)
  },

  clickPwdIcon(){
    console.log("clickPwdIcon")
    const self = this
    self.setData({
      showPwd: !self.data.showPwd
    })
  },

  // 增加照片
  addPhoto: function (e) {
    var self = this;
    const photos = self.data.emergency.self.photos
    var length = photos.length
    wx.chooseImage({
      count: 2 - length, // 
      sizeType: ['original'], //['original', 'compressed'], // 当前只提供原图  
      sourceType: ['album', 'camera'], // ['album', 'camera'], 
      success: function (resChoose) {
        resChoose.tempFiles.forEach((item, index) => {
          wx.showLoading({
            icon: "loading",
            title: "正在上传图片"
          })
          console.log(item.path)
          wx.cloud.uploadFile({
            cloudPath: util.buildPersonPhotoSrc(app.globalData.personid, index + length),
            filePath: item.path, // 小程序临时文件路径
          }).then(resUpload => {
            photos.push({
              src: resUpload.fileID
            })
            self.setData({
              "emergency.self.photos": photos,
              hasModified: true,
            })
          })
          wx.hideLoading()
        })
      }
    })
  },

  // 删除照片
  deletePhoto: function (e) {
    var self = this;
    const photos = self.data.emergency.self.photos
    var file = photos[photos.length - 1].src;
    wx.cloud.deleteFile({
      fileList: [file]
    })

    photos.pop(); // 去掉最后一个
    this.setData({
      "emergency.self.photos": photos,
      hasModified: true,
    })
  },

})