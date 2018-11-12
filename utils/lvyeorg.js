// 把和lvyeorg对接的具体实现代码都放到这里来
const app = getApp()
const qrcode = require('./qrcode.js')
const util = require('./util.js')

wx.cloud.init()
const db = wx.cloud.database()
const dbOutdoors = db.collection('Outdoors')

const LvyeOrgURL = 'https://www.lvye.net/panpa/'

// 得到登录org网站所需要的token， 用callback传回
const getToken = (callback) => {
  wx.login({
    success: function(res) {
      if (res.code) {
        var token = wx.getStorageSync("LvyeOrgToken")
        console.log(token)
        wx.request({
          url: LvyeOrgURL + 'get_token.php',
          method: 'POST',
          header: {
            "content-type": "application/x-www-form-urlencoded"
          },
          data: {
            token: token,
            code: res.code,
          },
          success: function(resp) {
            console.log('Get token: ');
            var resp_dict = resp.data;
            if (resp_dict.err_code == 0) {
              console.log(resp_dict.data.token);
              // wx.setStorageSync('LvyeOrgToken', resp_dict.data.token)
              if (callback) {
                console.log("token callback");
                callback(resp_dict.data.token)
              }
            } else {
              console.log(resp_dict.data.err_msg)
            }
          }
        })
      } else {
        console.log('获取用户ORG登录状态失败！' + res.errMsg)
      }
    }
  })
}

// 登录绿野网站，用callback得到登录结果
const login = (username, password, callback) => {
  console.log("lvyeorg.js login")
  console.log(username)
  console.log(password)

  getToken(token => {
    console.log("get token ok, is: "+ token)
    wx.setStorageSync('LvyeOrgToken', token)

    wx.request({
      url: LvyeOrgURL + "login.php",
      method: "post",
      header: {
        "content-type": "application/x-www-form-urlencoded"
      },
      data: {
        token: token,
        username: encodeURI(username),
        password: password
      },
      success: function(resp) {
        var resp_dict = resp.data;
        if (resp_dict.err_code == 0) {
          wx.setStorageSync('LvyeOrgToken', resp_dict.data.token) // 这里必须把token存起来
          if (callback) { // 回调函数，让外部知道是否登录了，哪个账号登录的
            callback(username)
          }
        } else {
          showErrModal(resp);
          if (callback) { // 登录失败，返回空字符串
            callback("")
          }
        }
      }
    })
  })
}

// 退出登录
const logout=  (callback)=> {
  var token = wx.getStorageSync("LvyeOrgToken")
  console.log(token)

  wx.request({
    url: LvyeOrgURL + 'logout.php',
    method: 'POST',
    header: { "content-type": "application/x-www-form-urlencoded" },
    data: {
      token: token,
    },
    success: function (resp) {
      console.log(resp);
      var resp_dict = resp.data;
      if (resp_dict.err_code == 0) {
        // wx.setStorageSync('LvyeOrgToken', resp_dict.data.token)
        if(callback){
          callback()
        }
      } else {
        showErrModal(resp);
      }
    }
  })
}

// 注册新账号
const register = (email, username, password1, password2, callback) =>{
  if (!username) {
    showErrModal("账号不能为空");
    return
  }
  if (!email) {
    showErrModal("请输入正确的邮箱地址");
    return
  }
  if (!password1 || !password2 || !(password1 == password2)) {
    showErrModal("密码不能为空，且两次密码必须相同");
    return
  }

  var token = wx.getStorageSync("LvyeOrgToken")
  console.log(token)
  wx.request({
    url: LvyeOrgURL + "register.php",
    method: "post",
    header: {
      "content-type": "application/x-www-form-urlencoded"
    },
    data: {
      token: token,
      username: username,
      password: password1,
      email: email
    },
    success: function (resp) {
      console.log(resp);
      var resp_dict = resp.data;
      if (resp_dict.err_code == 0) {
        // wx.setStorageSync('LvyeOrgToken', resp_dict.data.token)
        // 注册成功后，把信息写入Person表，登录org，告知发帖时间限制，退回到上一页面
        if(callback){
          callback()
        }
      } else {
        showErrModal(resp);
      }
    }
  })
}

// 上传一张照片
const uploadOneImage = (outdoorid, cloudPath, callback) => {
    // 步骤1：从 cloud中下载图片到临时文件
    wx.cloud.downloadFile({
      fileID: cloudPath,
    }).then(res => {
      console.log(res.tempFilePath)
      var token = wx.getStorageSync("LvyeOrgToken")
      console.log(token)
      // 步骤2：上传到 org网站，得到 file_url 和 aid
      wx.uploadFile({
        url: LvyeOrgURL + 'add_image.php',
        filePath: res.tempFilePath,
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
            if (callback) {
              console.log("callback(image, aid)")
              callback(resp_dict.data.file_url, resp_dict.data.aid)
            }
          } else {
            showErrModal(resp);
          }
        }
      })
    })
}

// 上传二维码
const uploadQrcode = (outdoorid, callback) => {
  qrcode.getCloudPath(outdoorid, (qrCode) => {
    uploadOneImage(outdoorid, qrCode, (image,aid)=>{
      if(callback){
        callback(image, aid)
      }
    })
  })
}

// 上传活动图片
const uploadImages = (outdoorid, pics, images, aids, callback) => {
  if (pics.length > 0) {
    uploadOneImage(outdoorid, pics.shift[0], (image, aid) => {
      images.push(image)
      aids.push(aid)
      uploadImages(outdoorid, pics, images, aids, callback)
    })
  }else{
    if (callback) {
      callback(images, aids)
    }
  }
}

// 这里确定活动应发布的版面
//  67: 周末户外活动; 90：周末休闲活动； 91:远期自助旅游
const chooseForum=(title)=> {
  console.log(title)
  var fid = 67 // 默认户外
  var day1 = new Date(title.date); // 活动日期
  var day2 = new Date(); // 当前日期
  var dayCount = (day1 - day2) / (1000 * 60 * 60 * 24) // 差了几天
  if (dayCount > 30) { // 30天算远期
    fid = 91
  } else if (title.loaded == "休闲" || title.level < 0.8) {
    fid = 90
  } else if (title.loaded == "重装" || title.level >= 1.0) {
    fid = 67
  }
  return fid
}



// 构建活动信息，以便发布活动信息到网站
const buildOutdoorMesage = (data, first, modifys, addMessage, allowSiteEntry) => {
  const NL = "\r\n" // "&#10"// "\r\n"// "&lt;br&gt;" // "<br>" // 换行符
  const NL2 = "\r\n\r\n" // "&#10&#10" // "\r\n\r\n"// "&lt;br&gt;&lt;br&gt;" // "<br><br>" // 换行符
  var message = "（以下内容由“户外报名”小程序同步发出）" + NL2
  if (addMessage && addMessage.length > 0) {
    message += addMessage + NL2
  }

  // 活动当前状态
  if (first || modifys.status) {
    message += "活动当前状态：" + NL + data.status + NL2
  }

  // 活动基本信息
  if (first) {
    // 文字介绍
    message += "活动介绍：" + NL + data.brief.disc + NL2
    // 领队，联系方式
    message += "领队：" + data.leader.userInfo.nickName + " " + util.changePhone(data.leader.userInfo.phone) + NL2
    // 活动时间：
    message += "活动时间：" + data.title.date + "（" + util.getDay(data.title.date) + "）" + NL2
    // 活动地点：
    message += "活动地点：" + data.title.place + NL2
    // 活动强度
    message += "活动强度：累计上升" + data.title.addedUp + "00米，累计距离" + data.title.addedLength + "公里（强度值：" + data.title.level + "）" + NL2
    // 活动负重
    message += "活动性质：" + data.title.loaded + NL2
  }

  // 集合时间及地点
  if (first || modifys.meets) {
    message += "集合时间及地点：" + NL
    data.meets.forEach((item, index) => {
      message += "第" + (index + 1) + "集合地点：" + (item.date ? item.date : '当天') + " " + (item.time ? item.time : ' ') + " " + item.place + NL
    })
    message += NL
  }

  // 活动路线
  if (first || modifys.route) {
    message += NL + "活动路线及行程安排：" + NL
    data.route.forEach((item, index) => {
      message += index + 1 + "） " + (item.date ? item.date : '当天') + " " + (item.time ? item.time : ' ') + " " + item.place + NL
    })
    message += NL
  }

  // 交通及费用 todo 

  // 人员限制和体力要求 空降
  if (first || modifys.limits) {
    if (data.limits && data.limits.maxPerson) {
      message += "活动人数：限" + data.limits.personCount + "人" + NL
    }
    if (data.limits && data.limits.allowPopup) {
      message += "本活动允许空降" + NL
    } else {
      message += "本活动不允许空降" + NL
    }
    if (data.title.level >= 1.0) {
      message += NL + "体力要求：要求报名人员近期应参加过强度值不小于" + data.title.level + "的活动，体力能满足本活动要求。" + NL
    }
  }

  // 活动装备 todo

  // 注意事项和免责条款
  if (first || modifys.disclaimer) {
    if (data.limits && data.limits.disclaimer) {
      message += NL + "注意事项和免责声明：" + NL
      message += data.limits.disclaimer + NL
    }
  }

// 报名须知：请微信扫描二维码，登录小程序报名； 贴上二维码
  if(first){
    message += NL + "报名须知：请用微信扫描二维码，登录小程序报名。" + NL
  }else {
    message += NL + "报名须知：请到帖子一楼，用微信扫描二维码，登录小程序报名。" + NL
  }
  if (!allowSiteEntry) { // 用当前活动表的设置
    message += "为方便领队汇总名单和后续提供微信后台消息通知，本活动不接受网站直接跟帖报名，敬请注意" + NL
  }

  return message
}

// 构建网站报名信息
const buildEntryMessage = (userInfo, entryInfo, isQuit)=> {
  var message = "（本内容由“户外报名”小程序自动发出，与发帖人无关；相应责权由" + userInfo.nickName+"承担）\r\n"
  if (isQuit) {
    message += userInfo.nickName + " 因故退出活动，抱歉！"
  } else {
    // 昵称/性别/电话（隐藏中间三位）/认路情况/同意免责/集合地点（报名状态）
    message += "代报名："+userInfo.nickName + "/" + userInfo.gender + "/"
    // 隐藏手机号码中间三位
    var phone = userInfo.phone.toString();
    phone = phone.substring(0, 3) + "***" + phone.substring(7)
    var knowWay = entryInfo.knowWay ? "认路" : "不认路"
    message += phone + "/" + knowWay + "/已同意免责条款/"
    message += "第" + (entryInfo.meetsIndex + 1) + "集合点"
    message += "（" + entryInfo.status + "）"
  }
  return message
}

// 发布活动
const addThread= function(outdoorid, data, callback) {
  var images=[]
  var aids=[]
  uploadQrCode(outdoorid, (image,aid)=>{
    images.push(image)
    aids.push(aid)
    uploadImages(outdoorid, data.brief.pics, (tmpImages, tmpAids) => {  
      images = images.concat(tmpImages)
      aids = aids.concat(tmpAids)
      var fid = chooseForum(data.title) // 要发帖的版面
      var message = buildOutdoorMesage(data, true, data.modifys, "", data.websites.lvyeorg.allowSiteEntry) // 构建活动信息
      console.log(message)
      var token = wx.getStorageSync("LvyeOrgToken")
      console.log(token)

      // 发帖
      wx.request({
        url: LvyeOrgURL + "add_thread.php",
        method: "POST",
        header: {
          "content-type": "application/x-www-form-urlencoded"
        },
        data: {
          token: token,
          fid: fid,
          subject: data.title.whole,
          message: message,
          pic_list: images,
          aid_list: aids,
        },
        success: function (resp) {
          console.log(resp); // resp.data.data.tid 帖子id；resp.data.data.pid 跟帖id post id
          var resp_dict = resp.data;
          if (resp_dict.err_code == 0) {
            wx.showToast({
              title: '同步绿野ORG发帖成功',
            });
            // wx.setStorageSync('LvyeOrgToken', resp_dict.data.token)
            if (callback) {
              callback(resp.data.data.tid)
            }
          } else {
            getError(resp, (error) => {
              wx.showModal({
                title: '同步绿野ORG失败',
                content: '原因是：' + error + "。\r\n点击“再试一次”则再次尝试同步，点击“以后再发”则在您“保存修改”或再次进入本活动页面时重发。",
                confirmText: "再试一次",
                cancelText: "以后再发",
                success(res) {
                  if (res.confirm) {
                    console.log('用户点击确定')
                    addThread(outdoorid, data, callback) // 立刻重发
                  } else if (res.cancel) {
                    console.log('用户点击取消') // 取消则“保存修改”或再次进入本活动页面时重发
                    // 这里要更新Outdoors表
                    data.websites.lvyeorg.fid = fid
                  }
                }
              })
            })
          }
          dbOutdoors.doc(outdoorid).update({
            data: { // 这里要更新Outdoors表
              websites: data.websites,
            }
          })
        }
      })
    })
  })
}

// 即时发布一条消息到绿野org网站，发布失败则记录到数据库中
const postMessage = (outdoorid, tid, message) => {
  console.log("const postMessage")
  console.log(outdoorid)
  console.log(tid)
  console.log(message)
  var token = wx.getStorageSync("LvyeOrgToken")
  console.log(token)

  // getToken(token => {
  //  console.log(token)
  wx.request({
    url: LvyeOrgURL + "add_post.php",
    method: "POST",
    header: {
      "content-type": "application/x-www-form-urlencoded"
    },
    data: {
      token: token,
      tid: tid,
      message: encodeURI(message),
    },
    success: function(resp) {
      console.log(resp);
      var resp_dict = resp.data;
      if (resp_dict.err_code == 0) {
        wx.showToast({
          title: '信息发布绿野ORG成功',
        });
        // wx.setStorageSync('LvyeOrgToken', resp_dict.data.token)
      } else {
        getError(resp, (error) => {
          wx.showModal({
            title: '信息发布到绿野ORG失败',
            content: '原因是：' + error + "。\r\n点击“再试一次”则再次尝试同步，点击“以后再发”则在下次进入本活动页面时自动重发。",
            confirmText: "再试一次",
            cancelText: "以后再发",
            success(res) {
              if (res.confirm) {
                console.log('用户点击确定')
                postMessage(outdoorid, tid, message) // 立刻重发
              } else if (res.cancel) {
                console.log('用户点击取消') // 取消则“保存修改”或再次进入本活动页面时重发
                // 这里要更新Outdoors表
                wx.cloud.callFunction({ // 把当前信息加入到 Outdoors的members中
                  name: 'addWaiting', // 云函数名称
                  data: {
                    outdoorid: outdoorid,
                    "website.lvyeorg.waitings": message
                  },
                })
              }
            }
          })
        })
      }
    }
  })
  //})
}

// 把未发布出去的信息加到waitings中
const add2Waitings =(outdoorid, message) => {
  wx.showModal({
    title: '请登录或注册绿野ORG',
    content: '本活动被领队设置为同步到绿野ORG网站，建议您注册ORG账号。系统将自动跳转到“绿野ORG登录”页面，请登录或注册以便报名信息同步',
    showCancel: false,
    confirmText: "知道了",
    success(res) {
      wx.navigateTo({
        url: '/pages/MyInfo/LvyeorgLogin',
      })
    }
  })

  console.log(message)
  wx.cloud.callFunction({ // 把当前信息加入到 Outdoors的members中
    name: 'addWaiting', // 云函数名称
    data: {
      outdoorid: outdoorid,
      waiting: message,
    },
  })
}

// 同步绿野org网站等待要发送的信息
const postWaitings = (outdoorid, tid) => {
  console.log("const postWaitings")
  dbOutdoors.doc(outdoorid).get().then(res => {
    if (res.data.websites && res.data.websites.lvyeorg.waitings) {
      postWaitingsInner(outdoorid, tid, res.data.websites.lvyeorg.waitings)
    }
  })
}

// 增加一个内部函数，减少数据库访问
const postWaitingsInner = (outdoorid, tid, waitings) => {
  console.log("const postWaitingsInner")
  console.log(outdoorid)
  console.log(tid)
  console.log(waitings.length)
  if (waitings.length > 0) {
    postOneWaiting(outdoorid, tid, waitings.shift(), () => {
      console.log(waitings.length)
      postWaitingsInner(outdoorid, tid, waitings) // 这么来保证顺序
    })
  }
}

// 发一条等待发布的信息，成功后用callback返回
const postOneWaiting = (outdoorid, tid, waiting, callback) => {
  console.log("const postFirstWaiting")
  console.log(outdoorid)
  console.log(tid)
  console.log(waiting)
  var token = wx.getStorageSync("LvyeOrgToken")
  console.log(token)
  
  wx.request({
    url: LvyeOrgURL + "add_post.php",
    method: "POST",
    header: {
      "content-type": "application/x-www-form-urlencoded"
    },
    data: {
      token: token,
      tid: tid,
      message: encodeURI(waiting),
    },
    success: function (resp) {
      var resp_dict = resp.data;
      console.log(resp_dict)
      if (resp_dict.err_code == 0) {
        wx.cloud.callFunction({
          name: 'shiftWaitings', // 云函数名称
          data: {
            outdoorid: outdoorid,
          }
        }).then(res=>{
          if (callback) { // 回调
            callback() 
          }
        })
      } else {
        getError(resp, (error) => {
          console.log(error)
        })
      }
    }
  })
}

// 得到绿野org网站反馈的错误信息，回调的方式传回
const getError = (resp, callback) => {
  if (resp.data.err_code != 0 && resp.data.err_msg) {
    console.log(resp.data.err_msg)
    if (callback) {
      callback(resp.data.err_msg)
    }
  } else {
    console.log(resp);
    var token = wx.getStorageSync("LvyeOrgToken")
    console.log(token)
    wx.request({
      url: LvyeOrgURL + 'report_error.php',
      method: 'POST',
      header: {
        "content-type": "application/x-www-form-urlencoded"
      },
      data: {
        token: token,
        error_log: resp.data,
        svr_url: LvyeOrgURL,
      },
      success: function(resp) {
        console.log("getError:");
        console.log(resp.data.err_msg);
        if (callback) {
          callback(resp.data.err_msg)
        }
      }
    })
  }
}

// 弹窗绿野org网站反馈的错误信息
const showError = (resp) => {
  getError(resp, error => {
    showErrModal(error)
  })
}

// 弹窗显示错误信息
const showErrModal = (error) => {
  wx.showModal({
    title: "绿野ORG错误提示",
    content: error,
    showCancel: false,
    confirmText: "知道了"
  });
}

module.exports = {
  getToken: getToken, // 得到token
  login: login, // 登录
  logout: logout, // 退出登录
  register: register, // 注册

  addThread: addThread, // 发帖
  buildOutdoorMesage: buildOutdoorMesage, // 构造活动信息
  buildEntryMessage: buildEntryMessage, // 构造报名信息
  postMessage: postMessage, // 跟帖
  add2Waitings: add2Waitings, // 往waiting中增加一条信息
  postWaitings: postWaitings, // 把正在等待发布的信息发布出去

  // 处理错误信息
  getError: getError,
  showError: showError,
  showErrModal: showErrModal,

}