const app = getApp()
const util = require('../../utils/util.js')
const qrcode = require('../../utils/qrcode.js')
const template = require('../../utils/template.js')
const cloudfun = require('../../utils/cloudfun.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
const dbPersons = db.collection('Persons')
const _ = db.command
 
Page({

  data: {
    outdoorid: null,
    title: "",
    members: [], // 所有队员
    pay: {},

  },

  onLoad: function (options) {
    console.log(options)
    const self = this
    self.data.outdoorid = options.outdoorid
    self.flushPay(res => {
      self.setData({
        members: res.data.members,
        title: res.data.title.whole,
      })
    })
  },

  flushPay(callback) {
    const self = this
    dbOutdoors.doc(self.data.outdoorid).get().then(res => {
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
            self.perpareResults()
            // 写入 pay 到数据库中
            cloudfun.updateOutdoorPay(self.data.outdoorid, pay)
            if (oldpath) { // 删除原来的二维码文件
              wx.cloud.deleteFile({
                fileList: [oldpath]
              })
            }
            self.sendPayNotice()
          })
        })
      }
    })
  },

  perpareResults() {
    const self = this
    self.data.pay.results
    self.data.members.forEach((item, index) => {

    })
  },
  
  sendPayNotice() {
    const self = this
    const pay = self.data.pay
    console.log(pay)
    
    // 发微信模板信息
    self.data.members.forEach((item, index) => {
      template.sendPayMsg2Member(self.data.outdoorid, item.personid, self.data.title, pay.cfo.nickName, pay.average, item.userInfo.nickName)
    })
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
    const self = this
    self.flushPay(none=>{
      const results = this.data.pay.results
      var count = 0
      for (var i in results) {
        count += results[i].num
      }
      self.setData({
        "pay.alreadyCount": count
      })
      self.statLacks()
      cloudfun.updateOutdoorPay(self.data.outdoorid, self.data.pay)
    })
  },

  // 统计没交款的
  statLacks(){
    const self = this
    const pay = this.data.pay
    const members = this.data.members
    pay.lacks = []
    members.forEach((item, index)=>{
      if (!pay.results[item.personid]) {
        pay.lacks.push(item.userInfo.nickName)
      }
    })
    
    self.setData({
      "pay":pay,
    })
    console.log(self.data.pay.lacks)
  },

})