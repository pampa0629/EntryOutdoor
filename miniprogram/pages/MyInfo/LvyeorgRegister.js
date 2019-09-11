const app = getApp()
const util = require('../../utils/util.js')
const lvyeorg = require('../../utils/lvyeorg.js')

Page({

  data: {
    email: "",
    username: "",
    password1: "",
    password2: "",

    emailMessage: "",
  },

  onLoad: function(options) {
  },

  onUnload: function() {
  },

  changeEmail: function(e) {
    const self = this
    console.log(e)
    self.setData({
      email: e.detail,
    })
    // 格式检测
    self.data.emailMessage = ""
    var pattern = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/;
    if (!pattern.test(self.data.email)) {
      self.data.emailMessage = "电子邮箱格式错误"
    }
    self.setData({
      emailMessage: self.data.emailMessage,
    })
  },

  changeUsername: function(e) {
    console.log(e)
    this.setData({
      username: e.detail,
    })
  },

  changePassword1: function(e) {
    console.log(e)
    this.setData({
      password1: e.detail,
    })
  },

  changePassword2: function(e) {
    console.log(e)
    this.setData({
      password2: e.detail,
    })
  },

  async tapLvyeorgRegister() {
    const self = this
    await lvyeorg.register(this.data.email, this.data.username, this.data.password1, this.data.password2)
    // 注册成功后，把信息写入Person表，登录org，告知发帖时间限制，退回到上一页面
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    prevPage.setData({
      "lvyeorgInfo.username": this.data.username,
      password: this.data.password1,
      hasModified: true,
    })
    prevPage.loginLvyeorg(callback => {
      wx.showModal({
        title: "注册账号" + self.data.username + "成功",
        content: '由于绿野ORG网站限制，您在10小时后才能发帖，这中间您的报名将由领队跟帖代报名。请登录http://www.lvye.org 以激活账号并了解绿野风格。\n系统即将为您以此账号登录并跳转回上个页面',
        showCancel: false,
        confirmText: "知道了",
        complete(res) {
          wx.navigateBack({})
        }
      })
    })
  },

})