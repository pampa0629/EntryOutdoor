const app = getApp()
const util = require('../../utils/util.js')
// const qrcode = require('../../utils/qrcode.js')
const message = require('../../utils/message.js')
const cloudfun = require('../../utils/cloudfun.js')
// const regeneratorRuntime = require('regenerator-runtime')

wx.cloud.init() 
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
const dbPersons = db.collection('Persons')
const _ = db.command
 
Page({

  data: {
    outdoorid: null,
    title: "",
    members: [], // 队员
    aaMembers: [], // 需要参加aa的其他人员
    pay: {},
    size: app.globalData.setting.size, // 界面大小
  },

  onLoad: function (options) {
    console.log(options)
    const self = this
    self.data.outdoorid = options.outdoorid
    self.flushPay(res => {
      self.setData({
        members: res.data.members,
        aaMembers: res.data.aaMembers,
        title: res.data.title.whole,
      })
      self.statPay()
    })
  },

  onShow() {
    this.setData({
      size: app.globalData.setting.size
    })
  },

  flushPay(callback) {
    const self = this
    dbOutdoors.doc(self.data.outdoorid).field({
      members:true,
      addMembers:true, 
      aaMembers:true,
      pay:true, 
      title:true,
    }).get().then(res => {
      self.setData({
        pay: res.data.pay,
      })
      console.log(self.data.pay)
      for (var i in self.data.pay.results) {
        let index = i; // 还必须用let才行
        this["clickOne" + index] = (e) => {
          self.clickOne(index, e)
        }
      }
        
      res.data.addMembers = res.data.addMembers ? res.data.addMembers:[]
      res.data.aaMembers = res.data.aaMembers ? res.data.aaMembers : []
      if(!self.data.pay.count) {
        self.setData({
          "pay.count": res.data.members.length + res.data.addMembers.length + res.data.aaMembers.length
        })
      }
      if (callback) {
        callback(res)
      }
    })
  },

  onUnload: function () {

  },

  changeTotal(e) {
    const self = this
    self.setData({
      "pay.total": e.detail,
      "pay.average": e.detail / self.data.pay.count,
    })
  },

  changeCount(e) {
    const self = this
    self.setData({
      "pay.count": e.detail,
      "pay.average": self.data.pay.total / e.detail,
    })
  },

  changeAverage(e) {
    const self = this
    self.setData({
      "pay.average": e.detail,
    })
  },

  // 上传收款二维码图片
  uploadQrcode() {
    var self = this;
    wx.chooseImage({
      count: 1, // 
      sizeType: ['original'], //['original', 'compressed'],   
      sourceType: ['album', 'camera'], // ['album', 'camera'], 
      success: function (resChoose) {
        resChoose.tempFiles.forEach((item, index) => {
          console.log(item.path)
          wx.cloud.uploadFile({
            cloudPath: util.buildPayQrcode(self.data.outdoorid),
            filePath: item.path, // 小程序临时文件路径
          }).then(resUpload => {
            var oldpath = self.data.pay.qrcode
            self.setData({
              "pay.qrcode": resUpload.fileID,
            })
            // 写入 pay 到数据库中
            cloudfun.opOutdoorItem(self.data.outdoorid, "pay", self.data.pay, "")
            if (oldpath) { // 删除原来的二维码文件
              wx.cloud.deleteFile({
                fileList: [oldpath]
              })
            }
          })
        })
      }
    })
  },

  
  // 预览收款二维码
  viewQrcode(e) {
    console.log("viewQrcode()",e)
    var urls = [this.data.pay.qrcode]
    console.log("urls:",urls)
    wx.previewImage({
      urls: urls,
      current: urls[0]
   })
  },

  // 通知所有队员付款
  async sendPayNotice() {
    const self = this
    const pay = self.data.pay
    console.log(pay)
    
    // 发微信模板信息;for 加 await实现顺序发送，避免并发太多
    for (let item of self.data.members) {
      // 订阅消息
      await message.sendOdInfoChange(item.personid, self.data.outdoorid, self.data.title, "财务官“" + pay.cfo.nickName + "”发起收款，人均" + pay.average+"元")
    }
    
    // aa members也要发送消息
    for (let item of self.data.aaMembers) {
      // 订阅消息
      await message.sendOdInfoChange(item.personid, self.data.outdoorid, self.data.title, "财务官“" + pay.cfo.nickName + "”发起收款，人均" + pay.average + "元")
    }
    
    wx.showToast({
      title: '已发送',
    })
  },

  clickOne(index, e) {
    console.log(e)
    const results = this.data.pay.results
    if(this.data.curScreen) {
      this.setData({
        curScreen: "",
      })
    } else {
      this.setData({
        curScreen: results[index].screen,
      })
    }
  },

  statPay() {
    console.log("CfoOutdoor.statPay()")
    const self = this
    self.flushPay(none=>{
      const results = this.data.pay.results
      var count = 0
      for (var i in results) {
        count += 1
      }
      self.setData({
        "pay.alreadyCount": count
      })
      self.statLacks()
      cloudfun.opOutdoorItem(self.data.outdoorid, "pay", self.data.pay, "")
    })
  },

  // 统计没交款的
  statLacks() {
    console.log("CfoOutdoor.statLacks()")
    const self = this
    const pay = this.data.pay
    pay.lacks = []
    const members = this.data.members
    members.forEach((item, index)=>{
      if (!pay.results[item.personid]) {
        pay.lacks.push(item.userInfo.nickName)
      }
    })
    const aaMembers = this.data.aaMembers
    aaMembers.forEach((item, index) => {
      if (!pay.results[item.personid]) {
        pay.lacks.push(item.userInfo.nickName)
      }
    })
    
    self.setData({
      "pay.lacks":pay.lacks,
    })
    console.log(self.data.pay.lacks)
  },

})