const app = getApp()
const util = require('../../utils/util.js')
const person = require('../../utils/person.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
const dbPersons = db.collection('Persons')
  
Page({ 

  data: { 
    isTesting: true, // for test， false true

    hasLogin: false, // 判断用户是否已经登录了(Persons表中有记录了)
    userInfo: {
      nickName: "待定",
      gender: "GG",
      phone: "",
    }, 
 
    myOutdoors: [], // 活动id
    entriedOutdoors: [],
    caredOutdoors: [],
    lastOutdoorid: null, // 最近访问过的活动ID

    // 与户外网站对接
    hasLoginLvyeorg: false, // 是否已经登录了org网站
    lvyeOrgUsername: "", // 绿野org 登录用户名
    lvyeOrgButton: "绿野ORG登录", // 按钮上显示的文字

    showCalls: false,
    Calls: [{
        name: '坐标',
        subname: '',
      },
      {
        name: '119',
        subname: '消防救援',
      },
      {
        name: '4006009958',
        subname: '蓝天救援',
      },
      {
        name: '4006007385',
        subname: '绿野救援',
      },
      {
        name: '120',
        subname: '医疗急救',
      },
      {
        name: '110',
        subname: '匪警电话',
      },
      {
        name: '95119',
        subname: '森林火警',
      },
      {
        name: '122',
        subname: '交通事故',
      },
      {
        name: '12369',
        subname: '环保监督',
      },
      {
        name: '121',
        subname: '天气预报',
      },
      {
        name: '114',
        subname: '号码查询',
      },
    ],

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
  },

  // 点击 > 图标想修改信息，主要看是否登录了
  clickModify: function(e) {
    console.log(e)
    if (!this.data.hasLogin) {
      wx.showModal({
        title: '请先登录',
        showCancel: false,
        confirmText: "知道了",
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
      if (e) { // 如果e不为null，则说明是通过按钮调用的，那就需要启动app的函数
        app.getPersonInfo(); // 调用app 获得个人信息的函数
      }
    }
  },

  // 绿野org登录，直接跳转到登录页面
  lvyeorgLogin: function() {
    wx.navigateTo({
      url: './LvyeorgLogin',
    })
  },

  onShow: function() {
    const self = this
    // 就看看有无最近的活动
    this.setData({
      lastOutdoorid: util.loadOutdoorID()
    })

    // 同时看看org是否登录了
    console.log("ready login org")
    // 登录org
    if (app.globalData.lvyeorgInfo) { // 数据库读取有了
      if (!app.globalData.lvyeorgLogin) { // 尚未登录，则主动登录
        app.callbackLoginLvyeorg = (res) => {
          self.setLoginLvyeorg(res)
        }
        app.loginLvyeOrg()
      } else { // 登录了直接设置就好
        self.setLoginLvyeorg({
          username: app.globalData.lvyeorgInfo.username
        })
      }
    } else { //数据度还没有读好，或者没有，则只能等着
      app.callbackLoginLvyeorg = (res) => {
        self.setLoginLvyeorg(res)
      }
    }
  },

  // 设置org登录信息
  setLoginLvyeorg: function(res) {
    console.log("MyInfo setLoginLvyeorg, res is: ")
    console.log(res)
    if (res.error) {
      this.setData({
        hasLoginLvyeorg: false,
        lvyeOrgButton: res.error,
      })
    } else if (res.username) {
      this.setData({
        hasLoginLvyeorg: true,
        lvyeOrgUsername: res.username,
      })
    }
  },

  createOnePerson: function (e) {
    const self = this;
    if (e != null) {
      console.log("MyInfo.js in createOnePerson fun, e is:" + +JSON.stringify(e, null, 2))
      self.data.userInfo.gender = util.fromWxGender(e.detail.userInfo.gender);
      self.data.userInfo.nickName = e.detail.userInfo.nickName
      person.createRecord(self.data.userInfo, app.globalData.openid, res=>{
        self.setPersonInfo(res.personid, res.userInfo)
      })
    }
  },
  
  createOnePerson_old: function(e) {
    const self = this;
    if (e != null) {
      console.log("MyInfo.js in createOnePerson fun, e is:" + +JSON.stringify(e, null, 2))

      // 最后仍然得判断openid真的在Persons表中没有，才创建新的
      dbPersons.where({
          _openid: app.globalData.openid,
        }).get()
        .then(res => {
          if (res.data.length == 0) { // 确认没有才加新的记录
            // 从微信登录信息中获取昵称和性别，不过不能与原有昵称重名
            util.getUniqueNickname(e.detail.userInfo.nickName, nickName => {
              self.data.userInfo.nickName = nickName
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
   // outdoorid = "cbdb4c165cff05af0362c70c3c1bac02" // todo del
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

  tapMyOutdoors() {
    wx.navigateTo({
      url: './MyOutdoors',
    })
  },

  bindGroup(){
    wx.navigateTo({
      url: '../AboutGroup/MyGroups',
    })
  },

  bindHelp: function() {
    var url = "https://docs.qq.com/doc/DVm1ITWx0V1dLVml3"
    var path = "/pages/detail/detail?url=" + url
    console.log(path)
    wx.navigateToMiniProgram({
      appId: 'wxd45c635d754dbf59', // 腾讯文档的appID
      path: path,
    })
  },

  bindEmergencyCall() {
    const self = this
    self.setData({
      showCalls: true,
    })

    var message = "获取坐标会有助于您报警救援时给出准确位置；小程序不会记录您的位置，请放心！"
    util.authorize("userLocation", message, res => {
      console.log("util.authorize,userLocation")
      wx.getLocation({
        altitude: true,
        success(res) {
          console.log(res)
          console.log(self.data.Calls)
          self.data.Calls[0].subname = "经度:" + res.longitude + ",维度:" + res.latitude + ",海拔:" + res.altitude + ",误差:" + res.accuracy + "米"
          self.setData({
            Calls: self.data.Calls
          })
        }
      })
    })
  },

  closeCalls() {
    this.setData({
      showCalls: false,
    })
  },

  selectCalls(e) {
    console.log(e)
    if (e.detail.name == "坐标") {
      wx.setClipboardData({
        data: "我的坐标位置："+e.detail.subname,
      })
    }
    else {
      util.phoneCall(e.detail.name, true)
    }
  },

  bindCareer() {
    wx.navigateTo({
      url: './MyCareer',
    })
  },

  //////////////////////////////// for testing ////////////////////////
  bindTest: function() {
    wx.navigateTo({
      url: '../Test/OneOutdoor',
    })
  },

})