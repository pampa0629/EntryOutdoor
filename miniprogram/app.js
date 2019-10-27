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

    // size:"", // 全局字体大小
    setting:{}, // 全局设置
    settingKey: "GlobalSetting",  // key 
  },

  loadSetting() {
    var setting = wx.getStorageSync(this.globalData.settingKey)
    if (setting) {
      this.globalData.setting = setting
    }
  },

  saveSetting(setting) {
    wx.setStorageSync(this.globalData.settingKey, setting)
    this.globalData.setting = setting
  },

  async onLaunch(options) {
    console.log("app.onLaunch()")
    console.log("options:",options)
    this.globalData.options = options // 存起来后面用
    
    this.loadSetting() // 加载全局设置

    // 判断微信版本号，太低的给予提示
    var versions = wx.getSystemInfoSync().version.split(".");
    if (versions[0] < '6' || (versions[0] == '6' && versions[1] < '7')) {
      // 版本不能低于 一定版本号
      wx.showToast({
        title: '微信版本过低',
        content: '请升级微信版本，不低于6.7.0',
      })
    } 

    await this.ensureLogin()
  },

  // 用await确保登录
  async ensureLogin() {
    console.log("app.ensureLogin()")
    const self = this
    if (self.globalData.hasUserInfo) {
      return true
    } else {
      var personid = util.loadPersonID()
      console.log("personid:", personid)
      try {
        var res = await dbPersons.doc(personid).get()
        console.log("person by id, res:", res)
        this.setPersonInfo(res.data)
        return true
      } 
      catch (e) {
        // 试图用openid查找
        self.globalData.openid = util.loadOpenID()
        console.log("openid:", self.globalData.openid)
        if (!self.globalData.openid){
          const res = await wx.cloud.callFunction({
            name: 'getUserInfo', // 云函数名称
          })
          console.log("openid by cloud:", res)
          self.globalData.openid = res.result.openId
          util.saveOpenID(self.globalData.openid)
        }
        //直接用person id读取不到，则尝试是否能通过openid读取到 person id
        try{
          const res = await dbPersons.where({_openid: self.globalData.openid}).get()
          console.log("person res by openid:", res)
          if (res.data.length > 0) { // 找到了
            self.setPersonInfo(res.data[0])
            // 同时设置到globalData中
            self.globalData.personid = res.data[0]._id
            util.savePersonID(self.globalData.personid)
            return true
          }
        }
        catch(e){
          return false
        }
      }
    }
    return false
  },

  setPersonInfo(data) {
    console.log("app.setPersonInfo()")
    this.globalData.personid = data._id
    this.globalData.openid = data._openid
    this.globalData.userInfo = data.userInfo;
    this.globalData.hasUserInfo = true
    this.dealCompatibility(data) // 处理兼容性问题
  },

  // 处理Person表的兼容性问题，关键是与网站的对接信息
  async dealCompatibility(data) {
    // www.lvye.org
    if (data.websites && data.websites.lvyeorgInfo) {
      console.log(data.websites)
      this.globalData.lvyeorgInfo = data.websites.lvyeorgInfo
      this.loginLvyeOrg()
    }
    // walk step autoUpdate
    if (data.career && data.career.step && data.career.step.autoUpdate) {
      if ( (new Date()).toLocaleDateString() != data.career.step.update ) {
        console.log("update walk step")
        person.updateWalkStep(this.globalData.personid)
      }
    }
    // 记录group id 和 openid， personid的对应关系
    await this.dealGroup()

    // next 
  },

  // 记录group id 和 openid， personid的对应关系
  async dealGroup() {
    console.log("app.dealGroup()")
    if (this.globalData.options.scene == 1044) {
      let groupOpenid = await this.getGroupId(this.globalData.options.shareTicket)
      this.globalData.groupOpenid = groupOpenid
      console.log("app.globalData.groupOpenid:", this.globalData.groupOpenid)
      group.ensureMember(groupOpenid, this.globalData.openid, this.globalData.personid, this.globalData.userInfo)
      person.adjustGroup(this.globalData.personid, groupOpenid)
    }
  }, 

  // 根据分享的群，得到群id
  async getGroupId(shareTicket) {
    console.log("app.getGroupId()",shareTicket)
    let res = await promisify.getShareInfo({shareTicket: shareTicket})
    // console.log("res:", res)
    var encryptedData = res.encryptedData
    var iv = res.iv
    let resLogin = await promisify.login()
    var code = resLogin.code
    // console.log("code:", code)
    let group = await cloudfun.decrypt(encryptedData, iv, code)
    // console.log("group:", group)
    return group.openGId
  },
 
  checkLogin(title, content, showCancel) {
    console.log('app.checkLogin()')
    title = title ? title:"此项功能须先登录"
    showCancel = showCancel == undefined ? true: showCancel
    console.log('showCancel: ', showCancel) 
    content = content ? content : "点击“去登录”将自动切换到“我的信息”页面，再点击“微信登录”按钮登录"
    if (!this.globalData.hasUserInfo) { // 判断是否登录先
      wx.showModal({
        title: title, // '查看“我的活动”需先登录',
        content: content, // '小程序将自动切换到“我的信息”页面，请点击“微信登录”按钮登录',
        showCancel: showCancel,
        cancelText:"先不了",
        confirmText: "去登录",
        success(res) {
          if (res.confirm) {
            console.log('用户点击确定')
            wx.switchTab({
              url: '../MyInfo/MyInfo'
            })
          } else if (res.cancel) {
            console.log('用户点击取消')
          }
        }
      })
      return false
    } 
    return true
  },

  // 登录绿野网站，用callback得到登录结果
  async loginLvyeOrg() { 
    const self = this
    console.log("app.js loginLvyeOrg()")
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
        let res = await lvyeorg.login(self.globalData.lvyeorgInfo.username, password)
        if (res.error && self.callbackLoginLvyeorg){
          self.callbackLoginLvyeorg({ error: res.error })
        }else {
          self.globalData.lvyeorgLogin = true
          // 回调函数，让外部知道是否登录了，哪个账号登录的
          if (self.callbackLoginLvyeorg) {
            self.callbackLoginLvyeorg({ username:res.username})
          }
        }
      }
    }
  },

})