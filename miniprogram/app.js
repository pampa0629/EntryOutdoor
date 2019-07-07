const promisify = require('./utils/promisify.js')
const util = require('./utils/util.js')
const qrcode = require('./utils/qrcode.js')
const lvyeorg = require('./utils/lvyeorg.js')
const person = require('./utils/person.js')
const cloudfun = require('./utils/cloudfun.js')
const group = require('./utils/group.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbPersons = db.collection('Persons')
const dbOutdoors = db.collection('Outdoors')
   
App({
  globalData: {
    openid: null, // 每个微信用户的内部唯一id
    personid: "", // Persons表中的当前用户_id

    // 用户信息
    hasUserInfo: false,
    userInfo: {},

    // 与户外网站对接
    lvyeorgInfo: null,
    lvyeorgLogin: false,
  },

  onLaunch(options) {
    console.log(options)
    this.globalData.options = options // 存起来后面用

    // 判断微信版本号，太低的给予提示
    var versions = wx.getSystemInfoSync().version.split(".");
    if (versions[0] < '6' || (versions[0] == '6' && versions[1] < '6')) {
      // 版本不能低于 6.6.0
      wx.showToast({
        title: '微信版本过低',
        content: '请升级微信版本，不低于6.6.3',
      })
    }

    const self = this
    // 尝试从本地缓存中读取openid
    self.globalData.openid = util.loadOpenID()
    // 从本地缓存中读取到openid，则尝试从Persons表读取用户信息
    console.log("app.js in onLaunch fun, self.globalData.openid:" + self.globalData.openid)
    if (self.globalData.openid != null && self.globalData.openid.length > 0) {
      if (self.openidCallback) {
        self.openidCallback(self.globalData.openid);
      }
      console.log("app.js in onLaunch fun, openid is ok:" + self.globalData.openid)
      self.getPersonInfo()
    } else { // 要是本地缓存中没有OpenID，就调用云函数来获取
      console.log("app.js in onLaunch fun, openid is null:" + self.globalData.openid)
      wx.showLoading({ // 保证获取OpenID成功
        title: '加载用户ID中...',
      })

      wx.cloud.callFunction({
        name: 'getUserInfo', // 云函数名称
        complete: res => {
          self.globalData.openid = res.result.openId
          if (self.openidCallback) {
            self.openidCallback(self.globalData.openid);
          }
          console.log("app.js in onLaunch fun, cloud function get openid:" + res.result.openId)
          // 缓存到本地
          util.saveOpenID(self.globalData.openid)
          self.getPersonInfo()
          wx.hideLoading()
        }
      })
    }
  },

  // 试图从Person数据库中读取当前用户的基本信息
  getPersonInfo: function() {
    const self = this;
    wx.showLoading({ // 保证获取OpenID成功
      title: '加载用户信息中...',
    })
    // 读取数据库
    self.globalData.personid = util.loadPersonID();
    console.log("app.js in getPersonInfo fun, loadPersonID is:" + self.globalData.personid)
    dbPersons.doc(self.globalData.personid).get()
      .then(res => { // 顺利读取到，万事大吉
        self.globalData.userInfo = res.data.userInfo;
        self.globalData.hasUserInfo = true
        self.dealCompatibility(res.data) // 处理兼容性问题
        // callback 第一种情况：数据库直接读取personid成功
        console.log("app.js in getPersonInfo fun, 1 callback personid is:" + self.globalData.personid)
        // console.log("app.js in getPersonInfo fun, 1 callback fun is:" + self.personidCallback)
        if (self.personidCallback) {
          self.personidCallback(self.globalData.personid, self.globalData.userInfo);
        }
      })
      .catch(err => {
        console.error(err)
        //直接用person id读取不到，则尝试是否能通过openid读取到 person id
        dbPersons.where({
          _openid: self.globalData.openid
        }).get().then(res => {
          if (res.data.length > 0) { // 找到了
            self.globalData.userInfo = res.data[0].userInfo;
            self.globalData.hasUserInfo = true;
            self.dealCompatibility(res.data[0]) // 处理兼容性问题
            // 同时设置到globalData中
            self.globalData.personid = res.data[0]._id;
            util.savePersonID(self.globalData.personid);
            // callback 第二种情况：通过openid找回正确的personid成功
            console.log("app.js in getPersonInfo fun, 2 callback personid is:" + self.globalData.personid)
            console.log("app.js in getPersonInfo fun, 2 callback fun is:" + self.personidCallback)
            if (self.personidCallback) {
              self.personidCallback(self.globalData.personid, self.globalData.userInfo);
            }
          } else { // 这是没有找到
            // 这里最重要的是把 personid的缓存清除掉，别下次登录继续害人
            self.globalData.personid = null;
            util.clearPersonID();
            // callback 第三种情况：就是找不到当前用户的personid，说明还没有登录了
            console.log("app.js in getPersonInfo fun, 3 callback personid is:" + self.globalData.personid)
            console.log("app.js in getPersonInfo fun, 3 callback fun is:" + self.personidCallback)
            if (self.personidCallback) {
              self.personidCallback(self.globalData.personid, null);
            }
          }
        })
      })
    wx.hideLoading()
  },

  // 处理Person表的兼容性问题，关键是与网站的对接信息
  dealCompatibility: function(data) {
    const self = this
    // www.lvye.org
    if (data.websites && data.websites.lvyeorgInfo) {
      console.log(data.websites)
      self.globalData.lvyeorgInfo = data.websites.lvyeorgInfo
      self.loginLvyeOrg()
    }
    // walk step autoUpdate
    if (data.career && data.career.step && data.career.step.autoUpdate) {
      if ( (new Date()).toLocaleDateString() != data.career.step.update ) {
        console.log("update walk step")
        person.updateWalkStep(self.globalData.personid, null)
      }
    }
    // 记录group id 和 openid， personid的对应关系
    self.dealGroup()

    // next 
  },

  // 根据分享的群，得到群id
  getGroupId(shareTicket, callback) {
    console.log("getGroupId")
    console.log(shareTicket)
    wx.getShareInfo({
      shareTicket: shareTicket,
      success: function (res) {
        console.log(res)
        var encryptedData = res.encryptedData;
        var iv = res.iv;
        wx.login({
          success: function (res) {
            var code = res.code;
            console.log(code)
            cloudfun.decrypt(encryptedData, iv, code, group => {
              console.log("openGId:")
              console.log(group)
              if (callback) {
                callback(group.openGId)
              }
            })
          }
        })
      }
    })
  },

  // 记录group id 和 openid， personid的对应关系
  dealGroup(){
    console.log("dealGroup")
    const self = this
    if (this.globalData.options.scene == 1044) {
      self.getGroupId(this.globalData.options.shareTicket, groupOpenid=>{
        group.ensureMember(groupOpenid, self.globalData.openid, self.globalData.personid, self.globalData.userInfo)
        person.adjustGroup(self.globalData.personid, groupOpenid)
      })
    }
  }, 
 
  checkLogin(title, content) {
    const self = this
    if (!self.globalData.hasUserInfo) { // 判断是否登录先
      wx.showModal({
        title: title, // '查看“我的活动”需先登录',
        content: content, // '小程序将自动切换到“我的信息”页面，请点击“微信登录”按钮登录',
        showCancel: false,
        confirmText: "知道了",
        complete: function (res) {
          wx.switchTab({
            url: '../MyInfo/MyInfo'
          })
        }
      })
    } 
  },

  // 登录绿野网站，用callback得到登录结果
  loginLvyeOrg: function() { 
    const self = this
    console.log("app.js loginLvyeOrg: function")
    console.log(self.globalData.lvyeorgInfo)
    console.log(self.globalData.lvyeorgLogin)

    if (self.globalData.lvyeorgInfo){
      if (self.globalData.lvyeorgLogin){
        // 回调函数，让外部知道是否登录了，哪个账号登录的
        if (self.callbackLoginLvyeorg){
          self.callbackLoginLvyeorg({username:self.globalData.lvyeorgInfo.username})
        }
      } else {
        var password = wx.getStorageSync("lvyeorg." + self.globalData.lvyeorgInfo.username)
        lvyeorg.login(self.globalData.lvyeorgInfo.username, password, res => {
          if (res.error && self.callbackLoginLvyeorg){
            self.callbackLoginLvyeorg({ error: res.error })
          }else {
            self.globalData.lvyeorgLogin = true
            // 回调函数，让外部知道是否登录了，哪个账号登录的
            if (self.callbackLoginLvyeorg) {
              self.callbackLoginLvyeorg({ username:res.username})
            }
          }
        })
      }
    }
  },

})