const promisify = require('./utils/promisify.js')
const util = require('./utils/util.js')
wx.cloud.init()
const db = wx.cloud.database({})
const dbPersons = db.collection('Persons')
const dbOutdoors = db.collection('Outdoors')

App({
  globalData: {
    openid: null, // 每个微信用户的内部唯一id
    personid: null, // Persons表中的当前用户_id
    // 用户信息
    hasUserInfo: false,
    userInfo: null
  },

  onLaunch: function() {
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
        // callback 第一种情况：数据库直接读取personid成功
        console.log("app.js in getPersonInfo fun, 1 callback personid is:" + self.globalData.personid)
        // console.log("app.js in getPersonInfo fun, 1 callback fun is:" + self.personidCallback)
        if (self.personidCallback) {
          self.personidCallback(self.globalData.personid, self.globalData.userInfo);
        }
      })
      .catch(err => {
        //直接用person id读取不到，则尝试是否能通过openid读取到 person id
        dbPersons.where({
          _openid: self.globalData.openid
        }).get().then(res => {
          if (res.data.length > 0) { // 找到了
            self.globalData.userInfo = res.data[0].userInfo;
            self.globalData.hasUserInfo = true;
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

  // 生成二维码，保存到本地，然后手动发朋友圈
  onShare2Circle: function(outdoorid, title, isLeader) {
    const self = this
    console.log(outdoorid)
    // 首先处理写本地相册的授权问题
    wx.getSetting({
      success(res) {
        if (!res.authSetting['scope.writePhotosAlbum']) {
          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success() {
              console.log('scope.writePhotosAlbum OK')
              self.createQrCode(outdoorid, title, isLeader)
            },
            fail() {
              wx.showModal({
                title: '必须授权',
                content: '必须取得写相册授权，才能保存生成的活动二维码，以便在朋友圈分享活动',
              })
            }
          })
        } else {
          self.createQrCode(outdoorid, title, isLeader)
        }
      }
    })
  },

  // 得到二维码图片的云存储路径
  getQrCodeCloudPath: function(outdoorid, callback) {
    const self = this
    // 先看看数据库中是否
    dbOutdoors.doc(outdoorid).get()
      .then(res => {
        if (res.data.QcCode) {
          console.log("Outdoors is:"+res.data.QcCode)
          callback(res.data.QcCode)
        } else {
          wx.cloud.callFunction({
            name: 'getAccessToken', // 云函数名称
          }).then(res => {
            console.log(res)

            wx.cloud.callFunction({
              name: 'createQrCode', // 云函数名称，返回二维码图片的云储存路径
              data: {
                outdoorid: outdoorid,
                access_token: JSON.parse(res.result).access_token,
              },
            }).then(res => {
              console.log("createQrCode: "+res)
              callback(res.result)
            })
          })
        }
      })
  },

  createQrCode: function(outdoorid, title, isLeader) {
    const self = this
    self.getQrCodeCloudPath(outdoorid, (QcCode)=>{
      console.log("QcCode: " + QcCode)

      wx.cloud.downloadFile({
        fileID: QcCode
      }).then(res => {
        console.log(res.tempFilePath)

        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          fail(err) {
            console.log(err)
          },
          success(res) {
            console.log(res)
            console.log(isLeader)
            // 把活动信息拷贝到剪贴板中
            var message = ""
            if (isLeader) { // 领队的
              message = "一起出去走走吧，这个户外活动：“" + title + "”我是领队哦！\n点击图片，长按识别小程序码即可报名参加了。"
            } else { // 队员的
              message = "一起出去走走吧，这个户外活动不错：“" + title + "”！\n点击图片，长按识别小程序码即可报名参加了。"
            }
            console.log(message)
            wx.setClipboardData({
              data: message,
              fail(err) {
                console.log(err)
              },
              success(res) {
                wx.showModal({
                  title: '准备就绪',
                  content: '活动二维码保存到本地相册，活动信息也已复制到内存，直接去朋友圈发图片和文字即可',
                  showCancel: false,
                  confirmText: "马上就去"
                })
              }
            })
          }
        })
      })
    })
  },

})