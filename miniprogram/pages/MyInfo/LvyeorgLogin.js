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
      isTesting: false, // 是否为测试帖，测试帖发布到技术小组版面
    },
    password: "",  // 密码存到本地缓存，不放到数据库中了
    showPwd:false, // 是否显示密码

    hasModified: false, // 是否有修改
    hasLogin:false, // 是否已经登录

    outdoorid:"", // 活动id
  },

  onLoad: function(options) {
    const self = this;
    self.setDefaultCheck()
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
          console.log(res.data.websites.lvyeorgInfo.username)
          console.log("load password: " + password)
          self.setData({
            lvyeorgInfo: res.data.websites.lvyeorgInfo,
            password: password,
          })
          // 读取后自动登录
          self.loginLvyeorg()
        }
      }).catch(err=>{
        console.error(err)
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
        console.log("lvyeorg." + self.data.lvyeorgInfo.username)
        console.log("save password:" + self.data.password)
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

  clickPwdIcon() {
    console.log("clickPwdIcon")
    const self = this
    self.setData({
      showPwd: !self.data.showPwd
    })
  },

  // org登录
  tapLvyeorgLogin: function() {
    this.loginLvyeorg()
  },
 
  // 内部实现
  loginLvyeorg:function(){
    const self = this;
    // 调用app中的登录函数
    console.log("loginLvyeorg: function")
    console.log(self.data.lvyeorgInfo)
    lvyeorg.login(self.data.lvyeorgInfo.username, self.data.password, res => {
      if(res.username){
        console.log("loginLvyeOrg callback")
        // 并存储到数据库中
        self.save2Person()
        self.setData({
          hasLogin: true
        })
        console.log(self.data.lvyeorgInfo)
        // 记得把全局的设置上
        app.globalData.lvyeorgInfo = self.data.lvyeorgInfo
        app.globalData.lvyeorgLogin = true
      }
      // 修改MyInfo中的按钮中的username名称
      self.setMyInfoUsername(res)
    })
  },

  // 修改MyInfo中的按钮中的username名称
  setMyInfoUsername:function(res){
    console.log(res)
    const self = this
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    if (prevPage && prevPage.setLoginLvyeorg){ // 判断是否为MyInfo页面
      prevPage.setLoginLvyeorg(res)
    }
  },
  
  tapLvyeorgLogout: function () {
    var self = this;
    lvyeorg.logout(callback=>{
      self.setData({
        hasLogin: false
      })
      app.globalData.lvyeorgLogin = false
      self.setMyInfoUsername({error:"绿野ORG登录"}) // 退出设置
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

  checkTesting: function (e) {
    console.log(e)
    const self = this;
    self.setData({
      "lvyeorgInfo.isTesting": !self.data.lvyeorgInfo.isTesting,
      hasModified: true,
    })
  },

  // 跳转到绿野ORG小程序的活动页面
  tapHall: function () {
    wx.navigateToMiniProgram({
      appId: 'wx1599b7c8d1e2b4d4', // 要跳转的小程序的appid
      path: "pages/index/index", // 跳转的目标页面
      success(res) {
        // 打开成功  
      }
    }) 
  },

///////////// 通过id定位活动的功能，暂时封起来，有需要再提供 //////////
  // bindOutdoorid(e){
  //   this.setData({
  //     outdoorid: e.detail,
  //   })
  // },

  // pasteOutdoorid() {
  //   const self = this
  //   wx.getClipboardData({
  //     success: function (res) {
  //       console.log(res.data)
  //       self.setData({
  //         outdoorid: res.data,
  //       })
  //     }
  //   })
  // },

  // // 通过活动id查找定位到“同步到org”上的活动
  // tapGotoEntry(){
  //   const self = this
  //   if(self.data.outdoorid) {
  //     wx.navigateTo({
  //       url: "../EntryOutdoor/EntryOutdoor?outdoorid=" + self.data.outdoorid
  //     })
  //   }
  // }

})