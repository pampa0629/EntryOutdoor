const app = getApp()
const util = require('../../utils/util.js')
const lvyeorg = require('../../utils/lvyeorg.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbPersons = db.collection('Persons')

Page({

  data: {
    lvyeorgInfo: {
      username: "",
      // 所有队员都必须遵守的代报名要求
      helpEntry: true, // 为尚未注册org的队员代报名
      // 领队需要决定的选项
      keepSame: true, // 发帖信息是否自动同步到org上
      allowSiteEntry: false, // 是否允许网站跟帖报名
    },
    password: "",  // 密码存到本地缓存，不放到数据库中了

    hasModified: false, // 是否有修改
    hasLogin:false, // 是否已经登录
  },

  onLoad: function(options) {
    const self = this;
    if (app.globalData.lvyeorgLogin && app.globalData.lvyeorgInfo){
      console.log(app.globalData.lvyeorgInfo)
      var password = wx.getStorageSync("lvyeorg." + app.globalData.lvyeorgInfo.username)
      self.setData({
        lvyeorgInfo: app.globalData.lvyeorgInfo,
        password: password,
        hasLogin:true,
      })
    } else{
    // 直接从数据库读取
    dbPersons.doc(app.globalData.personid).get()
      .then(res => {
        if (res.data.websites && res.data.websites.lvyeorgInfo) {
          var password = wx.getStorageSync("lvyeorg." + res.data.websites.lvyeorgInfo.username)
          console.log("load password: " + res.data.websites.lvyeorgInfo.username)
          console.log(password)
          self.setData({
            lvyeorgInfo: res.data.websites.lvyeorgInfo,
            password: password,
          })
          
          self.loginLvyeorg(null)
        }
      })
    }
    console.log(self.data.lvyeorgInfo)
  },

  onUnload: function() {
    this.save2Person()
  },

  // 存储到Persons数据库中
  save2Person:function(){
    const self = this;
    if (self.data.hasModified) { // 修改了才写回到数据库中
      dbPersons.doc(app.globalData.personid).update({
        data: {
          "websites.lvyeorgInfo": self.data.lvyeorgInfo
        }
      })
        .then(res => {
          console.log("save password:")
          console.log("lvyeorg." + self.data.lvyeorgInfo.username)
          console.log(self.data.password)
          wx.setStorageSync("lvyeorg." + self.data.lvyeorgInfo.username, self.data.password)
          self.setData({
            hasModified: false,
          })
        })
    }
  },

  changeUsername: function (e) {
    console.log(e)
    this.setData({
      "lvyeorgInfo.username": e.detail,
      hasModified: true
    })
  },

  changePassword: function (e) {
    console.log(e)
    this.setData({
      password: e.detail,
      hasModified: true
    })
  },

  // org登录
  tapLvyeorgLogin: function() {
    this.loginLvyeorg(null)
  },
 
  // 内部实现，增加回调能力，方便新注册用户直接登录
  loginLvyeorg:function(loginCallback){
    const self = this;
    // 调用app中的登录函数
    console.log("tapLvyeorgLogin: function")
    console.log(self.data.lvyeorgInfo)
    lvyeorg.login(self.data.lvyeorgInfo.username, self.data.password, callback => {
      console.log("loginLvyeOrg callback")
      // 并存储到数据库中
      self.save2Person()
      self.setDefaultCheck()
      self.setData({
        hasLogin: true
      })
      console.log(self.data.lvyeorgInfo)
      if (loginCallback){
        loginCallback()
      }
    })
  },

  tapLvyeorgLogout: function () {
    var self = this;
    lvyeorg.logout(callback=>{
      self.setData({
        hasLogin: false
      })
      app.globalData.lvyeorgLogin = false
    })
  },

  // 新用户注册
  tapLvyeorgRegister:function(){
    wx.navigateTo({
      url: './LvyeorgRegister',
    })
  },

  // 设置默认勾选项
  setDefaultCheck:function(){
    this.setData({
      "lvyeorgInfo.keepSame": true,
      "lvyeorgInfo.helpEntry": true,
      "lvyeorgInfo.allowSiteEntry": false,
    })
  }, 

  checkKeepSame: function(e) {
    console.log(e)
    const self = this;
    self.setData({
      "lvyeorgInfo.keepSame": !self.data.lvyeorgInfo.keepSame,
      hasModified: true,
    })
    if (self.data.lvyeorgInfo.keepSame) {
      self.setData({
        "lvyeorgInfo.helpEntry": true,
        "lvyeorgInfo.allowSiteEntry": false,
      })
    }
  },

  checkHelpEntry: function(e) {
    console.log(e)
    const self = this;
    if (self.data.lvyeorgInfo.helpEntry){
      wx.showModal({
        title: '不能取消',
        content: '您必须允许为非登录ORG队员代报名，系统才能保证ORG网站的报名顺序正确',
        showCancel:false,
        confirmText:"明白了",
      })
    }
    self.setData({
      "lvyeorgInfo.helpEntry": true,
    })
  },

  checkAllowSiteEntry: function(e) {
    console.log(e)
    const self = this;
    self.setData({
      "lvyeorgInfo.allowSiteEntry": !self.data.lvyeorgInfo.allowSiteEntry,
      hasModified: true,
    })
  },

})