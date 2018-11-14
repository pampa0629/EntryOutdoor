// pages/All/MyInfo.js
const app = getApp()
const util = require('../..//utils/util.js')
wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
const dbPersons = db.collection('Persons')

Page({ 
  
  data: {
    hasLogin: false, // 判断用户是否已经登录了(Persons表中有记录了)
    userInfo: {
      nickName: "待定",
      gender: "GG",
      phone: "136", 
    },
    
    myOutdoors: [], // 活动id
    entriedOutdoors: [],
    caredOutdoors: [],
    lastOutdoorid: null, // 最近访问过的活动ID

    // 与户外网站对接
    hasLoginLvyeorg:false, // 是否已经登录了org网站
    lvyeOrgUsername:"", // 绿野org 登录用户名
    lvyeOrgButton:"绿野ORG登录", // 按钮上显示的文字

    isTesting: true, // for test， false true
  },

  onLoad: function() {
    const self = this;
    if (app.globalData.openid == null || app.globalData.openid.length == 0) {
      app.openidCallback = (openid) => {
        app.globalData.openid = openid // 其实屁事没有，就是要等到app的onLaunch中得到openid
        this.loginWeixin(null) // 参数为null，说明是启动时主动调用，则无需重复调用app的函数
      }
    } else {
      this.loginWeixin(null)
    }

    console.log("ready login org")
    // 登录org
    if(!app.globalData.lvyeorgLogin){ // 尚未登录，则等待登录
      app.callbackLoginLvyeorg = (res)=>{
        self.setLoginLvyeorg(res)
      }
    } else{ // 登录了直接设置就好
      self.setLoginLvyeorg({username:username})
    }
  },

  // 设置org登录信息
  setLoginLvyeorg:function(res){
    console.log("MyInfo setLoginLvyeorg, res is: ")
    console.log(res)
    if(res.error){
      this.setData({
        hasLoginLvyeorg: false,
        lvyeOrgButton: res.error,
      })
    }else if(res.username){
      this.setData({
        hasLoginLvyeorg: true,
        lvyeOrgUsername: res.username,
      })
    }
  },

// 点击 > 图标想修改信息，主要看是否登录了
  clickModify: function (e) {
    console.log(e)
    if(!this.data.hasLogin){
      wx.showModal({
        title: '请先登录',
        showCancel:false,
        confirmText:"知道了",
        content: '首次使用请点击“微信登录”按钮，并请允许微信授权',
      })
    } else {
      wx.navigateTo({
        url: "ModifyInfo",
      })
    }
  },

  loginWeixin: function(e) {
    console.log("loginWeixin")
    const self = this;
    // 这里仍然存在：Persons表中已经有用户记录，但由于网络等原因尚未读取到的情况
    if (app.globalData.hasUserInfo) {
      self.setData({
        hasLogin: true,
        userInfo: app.globalData.userInfo,
      })
    } else {
      app.personidCallback = (personid, userInfo) => {
        if (personid != null) { // 不为null，则登录了
          self.setData({
            hasLogin: true,
            userInfo: util.createPerson(userInfo),
          });
        } else {
          // openid不为null，说明真的需要创建新记录了
          self.createOnePerson(e);
        }
      }
      if(e) { // 如果e不为null，则说明是通过按钮调用的，那就需要启动app的函数
        app.getPersonInfo(); // 调用app 获得个人信息的函数
      }
    }
  },

  // 绿野org登录，直接跳转到登录页面
  lvyeorgLogin:function(){
    wx.navigateTo({
      url: './LvyeorgLogin',
    })
  },

  onShow: function() {
    // 就看看有无最近的活动
    this.setData({
      lastOutdoorid: util.loadOutdoorID()
    })
  },

  createOnePerson: function(e) {
    const self = this;
    if (e != null) {
      console.log("MyInfo.js in createOnePerson fun, e is:" + +JSON.stringify(e, null, 2))

      // 最后仍然得判断openid真的在Persons表中没有，才创建新的
      dbPersons.where({
          _openid: app.globalData.openid,
        }).get()
        .then(res => {
          if (res.data.length == 0) { // 确认没有才加新的记录
            // 从微信登录信息中获取昵称和性别
            self.data.userInfo.nickName = e.detail.userInfo.nickName;
            self.data.userInfo.gender = util.fromWxGender(e.detail.userInfo.gender);
            // 在Persons表中创建一条新用户的记录
            dbPersons.add({
              data: {
                userInfo: self.data.userInfo,
                myOutdoors: self.data.myOutdoors,
                entriedOutdoors: self.data.entriedOutdoors,
                caredOutdoors: self.data.caredOutdoors,
                // websites: self.data.websites,
              }
            }).then(res => {
              self.setPersonInfo(res._id, self.data.userInfo)
            })
          } else if (res.data.length == 1) { // 有的话，用读取的就好
            self.setPersonInfo(res.data[0]._id, self.data.userInfo)
          } else { // 已经有多个账号，后台处理
            wx.setClipboardData({
              data: app.globalData.openid,
              success: function(res) {
                wx.showModal({
                  title: '检测到您有多个账号',
                  content: '可能会导致后续问题，OpenID已经复制到内存中，请发给作者“攀爬”予以核实。',
                  showCancel: false,
                  confirmText: "马上就去",
                })
              }
            })
          }
        })
    }
  },

  // 设置用户信息
  setPersonInfo: function(personid, userInfo) {
    app.globalData.userInfo = userInfo
    app.globalData.hasUserInfo = true
    app.globalData.personid = personid;
    util.savePersonID(app.globalData.personid);
    this.setData({
      hasLogin: true,
      userInfo: userInfo,
    })
  },

  // 回到最近的活动；要是自己创建的，就跳转到“创建活动”页面；
  // 要是不是自己创建的，则转到“参加活动”页面
  gotoLastOutdoor: function() {
    var outdoorid = util.loadOutdoorID();
    // onShow那里做了判断，这里就默认肯定有了
    dbOutdoors.doc(outdoorid).get()
      .then(res => {
        if (res.data._openid == app.globalData.openid) {
          // 自己的活动
          wx.switchTab({
            url: "../CreateOutdoor/CreateOutdoor",
          })
        } else {
          wx.navigateTo({
            url: "../EntryOutdoor/EntryOutdoor?outdoorid=" + outdoorid
          })
        }
      })
      .catch(err => {
        wx.showModal({
          title: '查找活动ID失败',
          content: '对应的活动可能已被领队删除',
          showCancel: false,
          confirmText: "知道了",
          complete: function(res) {
            util.clearOutdoorID()
          }
        })
      })
  },

  bindHelp: function() {
    wx.setClipboardData({
      data: 'https://docs.qq.com/doc/DVm1ITWx0V1dLVml3',
      success: function(res) {
        wx.showModal({
          title: '帮助文档',
          showCancel: false,
          confirmText: "知道了",
          content: "已经复制本小程序的帮助文档网页地址，请粘贴到浏览器中查看详细内容。"+
                  "\n当前版本号：0.5.5  \n作者：攀爬",
        })
      }
    })
  },

//////////////////////////////// for testing ////////////////////////
  bindTest: function () {
    wx.navigateTo({
      url: '../Test/OneOutdoor',
    })
  },

})