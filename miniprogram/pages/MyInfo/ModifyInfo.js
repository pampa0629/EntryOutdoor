// pages/MyInfo/ModifyInfo.js
const app = getApp()
wx.cloud.init()
const db = wx.cloud.database({})
const dbPersons = db.collection('Persons')
const _ = db.command

const util = require('../../utils/util.js')
const cloudfun = require('../../utils/cloudfun.js')
const person = require('../../utils/person.js')
const promisify = require('../../utils/promisify.js')
// const crypto = require('../../utils/crypto.js')
 
// let interstitialAd = null // 插屏广告

Page({ 
  data: { 
    userInfo: {
      nickName: null,  
      gender: null,
      phone: null
    },
    Genders: ["GG", "MM"], // 性别选项; //性别 0:未知、1:男、2:女
    hasModified: false, // 是否修改了
    size: app.globalData.setting.size, // 界面大小

    phoneErrMsg: "", // 电话号码输入错误提示 ==手机号格式错误
    nickErrMsg: "", // 昵称必须唯一
    oldNickName: "", // 只有修改了，才进行昵称的唯一性判断

    facecodes:[], // 脸部特征数组，每个元素包括：src，云存储地址和 code：特征编码

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

  onShow() {
    this.setData({
      size: app.globalData.setting.size
    })
  },

  async onLoad(options) {
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    this.setData({
      userInfo: prevPage.data.userInfo,
      password: wx.getStorageSync("EmergencyPassword")
    })
    console.log("password: ", this.data.password)
    this.data.oldNickName = this.data.userInfo.nickName

    // 直接load得到facecodes
    let res = await dbPersons.doc(app.globalData.personid).get()
    this.data.facecodes = res.data.facecodes ? res.data.facecodes:[]

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
    // this.addAd()
  },

  // // 添加广告
  // addAd() {
  //   if (wx.createInterstitialAd) {
  //     interstitialAd = wx.createInterstitialAd({
  //       adUnitId: 'adunit-83d9b67d53f57ebe'
  //     })
  //     interstitialAd.onLoad(() => {
  //       console.log('ad onLoad event emit')
  //     })
  //     interstitialAd.onError((err) => {
  //       console.log('ad onError event emit', err)
  //     })
  //     interstitialAd.onClose((res) => {
  //       console.log('ad onClose event emit', res)
  //     })
  //   }
  // },

  // showAd() {
  //   console.log('showAd()')
  //   console.log('interstitialAd: ', interstitialAd)
  //   // 每次进入显示广告
  //   if (interstitialAd) {
  //     interstitialAd.show()
  //       .then(res => {
  //         console.log(res)
  //       }).catch(err => {
  //         console.error(err)
  //       })
  //   }
  // },

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
 
  // async changeNickname(e) {
  //   console.log("changeNickname()", e)
  //   let res = await person.checkNickname(e.detail,app.globalData.personid) // , (errMsg,result)=>{
  //   console.log("change name:" + res.result + ", " + res.msg)
  //   if (!res.result) { // 不成功，强制回到最后一个合法的名字
  //     e.detail = this.data.oldNickName
  //   } 
  //   this.setData({
  //     hasModified: true,
  //     "userInfo.nickName": e.detail,
  //     userInfo: this.data.userInfo,
  //     nickErrMsg: res.msg,
  //   })
  //   console.log("old name:" + this.data.oldNickName)
  // },

  async changeNickname(e) {
    console.log("changeNickname()", e)
    let res = await person.checkNickname(e.detail, app.globalData.personid)
    console.log("change name:" + res.result + ", " + res.msg)
    this.setData({
      hasModified: true,
      "userInfo.nickName": e.detail,
      nickErrMsg: res.msg,
    })
    console.log("old name:" + this.data.oldNickName)
  },

  async blurNickname(e) {
    console.log("blurNickname()", e)
    var nickErrMsg = ""
    let res = await person.checkNickname(e.detail.value, app.globalData.personid)
    console.log("check res:", res)
    console.log("oldNickName:", this.data.oldNickName)
    if (!res.result) { // 不成功，强制回到最后一个合法的名字
      e.detail.value = this.data.oldNickName
      nickErrMsg += res.msg + "，已自动恢复原名"
    } 
    this.setData({
      "userInfo.nickName": e.detail.value,
      nickErrMsg: nickErrMsg,
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
    // this.showAd()
  },

  changeGender: function(e) {
    console.log(e)
    const self = this
    self.setData({
      "userInfo.gender": e.detail,
      hasModified: true,
    })
    // this.showAd()
  },

  
// // 个人标准照片
//   // 增加照片
//   async addStandardPic(e) {
//     var self = this
//     var length = self.data.facecodes.length
    
//     let resChoose = await promisify.chooseImage({
//       count: 1, // 
//       sizeType: ['original'], //['original', 'compressed'], // 必须用原图
//       sourceType: ['album', 'camera'], // ['album', 'camera'], 
//     })
//     console.log("chooseImage:", resChoose)

//     const item = resChoose.tempFiles[0]
//     if (item.size < 5000) { // 图片不能小于5kb
//       wx.showToast({
//         title: '图片不能小于5KB，防止脸部不够清晰',
//       })
//     } else {
//       wx.showLoading({title: "正在上传图片"})
//       console.log(item.path)
//       let resUpload = await wx.cloud.uploadFile({
//         cloudPath: util.buildPersonPhotoSrc(app.globalData.personid, length),
//         filePath: item.path
//       })// 小程序临时文件路径
//       console.log("fileID:", resUpload.fileID)
//       const resTemp = await wx.cloud.getTempFileURL({
//         fileList: [resUpload.fileID]
//       })
//       const tempUrl = resTemp.fileList[0].tempFileURL
//       console.log("url:", tempUrl)
      
//       wx.showLoading({ title: "人脸识别中..." })
//       let code = await promisify.request({
//         url: "https://service-q0d7fjgg-1258400438.gz.apigw.tencentcs.com/release/helloworld?url=" + tempUrl,
//         // method: "POST",
//       })
//       console.log("code:", code)
//       if (code.statusCode != 504) {
//         self.data.facecodes.push({ src: resUpload.fileID, code: code.data })
//         self.setData({
//           "facecodes": self.data.facecodes, 
//         })
//         await cloudfun.opPersonItem(app.globalData.personid, "facecodes", self.data.facecodes)
//       } else{
//         wx.showToast({
//           title: '服务超时请重试',
//         })
//       }
//       wx.hideLoading()
//     }
//   },

//   async addStandardPic2(e) {
//     var self = this
//     var length = self.data.facecodes.length
//     const request = promisify(wx.request)
//     const chooseImage = promisify(wx.chooseImage)
//     wx.chooseImage({
//       count: 3 - length, // 
//       sizeType: ['original'], //['original', 'compressed'], // 必须用原图
//       sourceType: ['album', 'camera'], // ['album', 'camera'], 
//       async success(resChoose) {
//         resChoose.tempFiles.forEach(async (item, index) => {
//           if (item.size < 5000) { // 图片不能小于5kb
//             wx.showToast({
//               title: '图片不能小于5KB，防止脸部不够清晰',
//             })
//           } else {
//             wx.showLoading({
//               icon: "loading",
//               title: "正在上传图片"
//             })
//             console.log(item.path)
//             let resUpload = await wx.cloud.uploadFile({ 
//               cloudPath: util.buildPersonPhotoSrc(app.globalData.personid, index + length),
//               filePath: item.path })// 小程序临时文件路径
//             console.log("fileID:", resUpload.fileID)
//             const resTemp = await wx.cloud.getTempFileURL({
//               fileList: [resUpload.fileID]
//             })
//             const tempUrl = resTemp.fileList[0].tempFileURL
//             console.log("url:",tempUrl)
//             let code = await request({
//               url: "https://service-q0d7fjgg-1258400438.gz.apigw.tencentcs.com/release/helloworld?url=" + tempUrl,
//               method: "POST",
//               // header: {
//               //   "content-type": "application/x-www-form-urlencoded"
//               // },
//             })
//             console.log("code:", code)
//             self.data.facecodes.push({src: resUpload.fileID,code:code.data})
//             self.setData({
//               "facecodes": self.data.facecodes,
//               })
//             await cloudfun.opPersonItem(app.globalData.personid, "facecodes", self.data.facecodes)
//             // self.data.pics.push({
//             //     src: resUpload.fileID
//             //   })
//             //   self.setData({
//             //     "pics": self.data.pics,
//             //   })
//             //   self.save()
//             // })
//             wx.hideLoading()
//           }
//         })
//       }
//     })
//   },

// // 删除照片
//   deleteStandardPic() {
//     console.log("CreateOutdoor.js in deletePic fun, pics count is:" + this.data.pics.length)
//     // 试着删除文件，要删不掉，则是用模板创建的活动，图片是别人的
//     var file = this.data.pics[this.data.pics.length - 1].src;
//     wx.cloud.deleteFile({
//       fileList: [file]
//     }).then(res => {
//       console.log("CreateOutdoor.js in deletePic fun, del pic ok: " + JSON.stringify(res, null, 2))
//     }).catch(err => {
//       console.error(err)
//     })

//     this.data.pics.pop(); // 去掉最后一个
//     this.save()
//   },


// 紧急联系信息，暂时封存
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