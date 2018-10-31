import Page from 'page';

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

  get_token: function() {
    var that = this;
    wx.login({
      success: function(res) {
        if (res.code) {
          var code = res.code // "001BmXZe2RcXhC0tQe0f2DZ30f2BmXZ5" // res.code
          console.log("code");
          console.log(code);
          var token = wx.getStorageSync("token")
          console.log("token");
          console.log(token);
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

  showErrModal: function (err_msg) {
    wx.showModal({
      content: err_msg,
      showCancel: false
    });
  },

  showSvrErrModal: function (resp) {
    var that = this;

    if (resp.data.err_code != 0 && resp.data.err_msg) {
      console.log(resp.data.err_msg)
      this.showErrModal(resp.data.err_msg);
    } else {
      console.log(resp);
      wx.request({
        url: that.data.svr_url + 'report_error.php',
        method: 'POST',
        header: { "content-type": "application/x-www-form-urlencoded" },
        data: {
          token: wx.getStorageSync("token"),
          error_log: resp.data,
          svr_url: that.data.svr_url,
        },
        success: function (resp) {
          console.log("showSvrErrModal:" + resp);
        }
      })
    }
  },

});