import Page from 'page';
const app = getApp()

Page({
  data: {
    base_url: 'https://www.lvye.net/',
    svr_url: 'https://www.lvye.net/panpa/',

    username: '',
    password: '',
    email: "",
  },

  onLoad() {
    this.get_token()
  },

  get_token: function(callback) {
    var that = this;
    wx.login({
      success: function(res) {
        if (res.code) {
          var code = res.code 
          var token = wx.getStorageSync("token")
          wx.request({
            url: that.data.svr_url + 'get_token.php',
            method: 'POST',
            header: {
              "content-type": "application/x-www-form-urlencoded"
            },
            data: {
              token: token,
              code: code,
            },
            success: function(resp) {
              console.log('Get token...');
              console.log(resp);
              var resp_dict = resp.data;
              if (resp_dict.err_code == 0) {
                wx.setStorage({
                  key: 'token',
                  data: resp_dict.data.token,
                  success: function() {
                    console.log('Close wechat login...');
                    /*
                    if (resp_dict.data.has_login != 1) {
                        that.wxLogin();
                    }
                    */
                  }
                })
              }
            }
          })
        } else {
          console.log('获取用户登录状态失败！' + res.errMsg)
        }
      }
    });
  },

  onLogin() {
    var that = this;

    that.data.username = "pampa";
    that.data.password = "xx123zzm";

    wx.request({
      url: that.data.svr_url + "login.php",
      method: "post",
      header: {
        "content-type": "application/x-www-form-urlencoded"
      },
      data: {
        token: wx.getStorageSync("token"),
        username: encodeURI(that.data.username),
        password: that.data.password
      },
      success: function(resp) {
        console.log("登录信息：");
        console.log(resp);
        var resp_dict = resp.data;
        if (resp_dict.err_code == 0) {
          wx.showModal({
            title: '登录成功',
            content: '欢迎回来：' + that.data.username,
          })
          wx.setStorage({
            key: 'token',
            data: resp_dict.data.token,
          });
          wx.setStorage({
            key: 'login',
            data: 1,
          });
          wx.setStorage({
            key: 'username',
            data: that.data.username,
          })
        }
      }
    })
  },

  // suijitest
  // test_lvyeorg@sina.com
  // xx123zzm
  // 抱歉，您目前处于见习期间，需要等待 600 分钟后才能进行本操作
  onRegister() {
    var that = this;

    that.data.username = "suijitest" // "pampa"// "zengzhiming";
    that.data.password = "xx123zzm";
    that.data.email = "test_lvyeorg@sina.com" // "zengzhiming@supermap.com";

    wx.request({
      url: that.data.svr_url + "register.php",
      method: "post",
      header: {
        "content-type": "application/x-www-form-urlencoded"
      },
      data: {
        token: wx.getStorageSync("token"),
        username: that.data.username,
        password: that.data.password,
        email: that.data.email
      },
      success: function(resp) {
        console.log(resp);
        var resp_dict = resp.data;
        if (resp_dict.err_code == 0) {
          wx.showToast({
            title: '注册成功',
          });
          wx.setStorage({
            key: 'token',
            data: resp_dict.data.token,
          });
        } else {
          that.showSvrErrModal(resp);
        }
      }
    })
  },


  // fid: 67  户外运动论坛的id 
  onCreate: function () {
    const that = this
    wx.request({
      url: that.data.svr_url + "add_thread.php",
      method: "POST",
      header: {
        "content-type": "application/x-www-form-urlencoded"
      },
      data: {
        token: wx.getStorageSync("token"),
        fid: "67",
        subject:"测试主题",
        message: "攀爬小程序发帖测试",
      },
      success: function (resp) {
        console.log(resp);
        var resp_dict = resp.data;
        if (resp_dict.err_code == 0) {
          wx.showToast({
            title: '发帖成功',
          });
          wx.setStorage({
            key: 'token',
            data: resp_dict.data.token,
          });
        } else {
          that.showSvrErrModal(resp);
        }
      }
    })
  },

  // tid:44434166 帖子的id
  onEntry:function(){
    const that = this
    wx.request({
      url: that.data.svr_url + "add_post.php",
      method: "POST",
      header: {
        "content-type": "application/x-www-form-urlencoded"
      },
      data: {
        token: wx.getStorageSync("LvyeOrgToken"),
        tid: "44434182",
        message: "攀爬小程序换行<br>测试"+"这样换\r\n行呢？ 或者这样\<br\>换呢？",
      },
      success: function (resp) {
        console.log(resp);
        var resp_dict = resp.data;
        if (resp_dict.err_code == 0) {
          wx.showToast({
            title: '跟帖成功',
          });
          wx.setStorage({
            key: 'LvyeOrgToken',
            data: resp_dict.data.token,
          });
        } else {
          that.showSvrErrModal(resp);
        }
      }
    })
  },

  showErrModal: function(err_msg) {
    wx.showModal({
      content: err_msg,
      showCancel: false
    });
  },

  showSvrErrModal: function(resp) {
    var that = this;

    if (resp.data.err_code != 0 && resp.data.err_msg) {
      console.log(resp.data.err_msg)
      this.showErrModal(resp.data.err_msg);
    } else {
      console.log(resp);
      wx.request({
        url: that.data.svr_url + 'report_error.php',
        method: 'POST',
        header: {
          "content-type": "application/x-www-form-urlencoded"
        },
        data: {
          token: wx.getStorageSync("token"),
          error_log: resp.data,
          svr_url: that.data.svr_url,
        },
        success: function(resp) {
          console.log("showSvrErrModal:" + resp);
        }
      })
    }
  },

  onContact: function(e) {
    console.log(JSON.stringify(e, null, 2))
    wx.showModal({
      title: '客服消息',
      content: JSON.stringify(e, null, 2),
    })
  },

  onTest: function(e) {

    console.log(e.detail.errMsg)
    console.log(e.detail.iv)
    console.log(e.detail.encryptedData)

  },

  reg: function(e) {
    console.log(e);
    console.log(e.detail.formId);
    

    // POST https://api.weixin.qq.com/cgi-bin/message/wxopen/template/send?access_token=ACCESS_TOKEN

    wx.cloud.callFunction({
      name: 'getAccessToken', // 云函数名称
    }).then(res => {
      console.log(res.result);

      console.log(JSON.parse(res.result))
      var access_token = JSON.parse(res.result).access_token
      console.log(access_token)
      console.log("wx.request")
      wx.request({
        url: 'https://api.weixin.qq.com/cgi-bin/message/wxopen/template/send?access_token=' + access_token,
        method: "POST",
        data: {
          // ogNmG5P3ZlT29kXGhWfGX5nC_sqA ogNmG5KFPConlOTeQNYciQrW5SE4
          // touser: app.globalData.openid,//openId
          touser: "ogNmG5P3ZlT29kXGhWfGX5nC_sqA", 
          template_id: "6yT3OTFpgiVohiqSOly-e744802MYBnnOuCwJgYaxWA",
          page: 'pages/EntryOutdoor/EntryOutdoor', // ?outdoorid=' + self.data.outdoorid
          form_id: "1541424696118", // e.detail.formId,//formID
          data: {//下面的keyword*是设置的模板消息的关键词变量  
            "keyword1": {
              "value": "339208499"
            },
            "keyword2": {
              "value": "2015年01月05日 12:30"
            },
            "keyword3": {
              "value": "攀爬"
            },
          },
        },
        header: {
          'content-type': 'application/json' // 默认值
        },
        success(res) {
          console.log("res.data: ")
          console.log(res.data)
        }
      })
    })
  },

  onUploadImage:function(){
    const that = this
    wx.chooseImage({
      count: 1, // 
      sizeType: ['compressed'], //['original', 'compressed'], // 当前只提供压缩图  
      sourceType: ['album'], // ['album', 'camera'], // 当前只能相册选取
      success: function (resChoose) {
        console.log(resChoose)
        
        var token = wx.getStorageSync("LvyeOrgToken")
        console.log(token)

        wx.uploadFile({
          url: that.data.svr_url + 'add_image.php',
          filePath: resChoose.tempFilePaths[0],
          name: "myfile", 
          formData: {
            token: token,
          },
          success: function (resp) {
            console.log(resp);
            var resp_dict = JSON.parse(resp.data)
            console.log(resp_dict)
            if (resp_dict.err_code == 0) {
              console.log(resp_dict.data.file_url)
              console.log(resp_dict.data.aid)
            } else {
              app.showLvyeOrgError(resp);
            }
          }
        })
      }
    })
  },

  onSame: function () {
    var data = ["a","b","c"]
    this.onSameInner(data)
  }, 

  onSameInner:function(data){
    console.log(data.length)
    if (data.length>0){
      this.doOne(data.shift(), res=>{
        this.onSameInner(data)
      })
    }
  },

  doOne:function(one, callback){
    console.log(one)
    if (callback){
      callback()
    }
  },


});