// 把和lvyeorg对接的具体实现代码都放到这里来
const app = getApp()
const qrcode = require('./qrcode.js')
const util = require('./util.js')
const cloudfun = require('./cloudfun.js')

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
          fail: function(error) {
            // showModal("绿野ORG网站连接不上")
            console.log(error)
            if (callback) { // 连不上返回0
              callback(0)
            }
          },
          success: function(resp) {
            console.log('Get token: ');
            console.log(resp)
            var resp_dict = resp.data;
            if (resp_dict.err_code == 0) {
              console.log(resp_dict.data.token);
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
        console.log('微信登录失败！' + res.errMsg)
      }
    }
  })
}

// 登录绿野网站，用callback得到登录结果
// 
const login = (username, password, callback) => {
  console.log("lvyeorg.js login fun")
  console.log(username)
  console.log(password)

  getToken(token => {
    if (!token && callback) {
      callback({
        error: "绿野ORG挂了",
        username: ""
      })
    } else {
      console.log("get token ok, is: " + token)
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
        fail: function(error) {
          if (callback) { // 登录失败，返回空字符串
            callback({
              error: "绿野ORG挂了",
              username: ""
            })
          }
        },
        success: function(resp) {
          console.log("lvye org login ok")
          var resp_dict = resp.data;
          if (resp_dict.err_code == 0) {
            wx.setStorageSync('LvyeOrgToken', resp_dict.data.token) // 这里必须把token存起来
            if (callback) { // 回调函数，让外部知道是否登录了，哪个账号登录的
              callback({
                username: username
              })
            }
          } else {
            getError(resp, error => {
              if (callback) { // 登录失败，返回空字符串
                callback({
                  error: error,
                  username: ""
                })
              }
            })
          }
        }
      })
    }
  })
}

// 退出登录
const logout = (callback) => {
  var token = wx.getStorageSync("LvyeOrgToken")
  console.log(token)

  wx.request({
    url: LvyeOrgURL + 'logout.php',
    method: 'POST',
    header: {
      "content-type": "application/x-www-form-urlencoded"
    },
    data: {
      token: token,
    },
    success: function(resp) {
      console.log(resp);
      var resp_dict = resp.data;
      if (resp_dict.err_code == 0) {
        if (callback) {
          callback()
        }
      } else {
        showErrorModel(resp);
      }
    }
  })
}

// 注册新账号
const register = (email, username, password1, password2, callback) => {
  if (!username) {
    showModal("账号不能为空");
    return
  }
  if (!email) {
    showModal("请输入正确的邮箱地址");
    return
  }
  if (!password1 || !password2 || !(password1 == password2)) {
    showModal("密码不能为空，且两次密码必须相同");
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
    success: function(resp) {
      console.log(resp);
      var resp_dict = resp.data;
      if (resp_dict.err_code == 0) {
        // wx.setStorageSync('LvyeOrgToken', resp_dict.data.token)
        // 注册成功后，把信息写入Person表，登录org，告知发帖时间限制，退回到上一页面
        if (callback) {
          callback()
        }
      } else {
        showErrorModel(resp);
      }
    }
  })
}

// 上传一张照片
const uploadOneImage = (outdoorid, cloudPath, callback) => {
  console.log("uploadOneImage fun")
  console.log("cloudPath is:" + cloudPath)
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
      success: function(resp) {
        console.log(resp);
        var resp_dict = JSON.parse(resp.data)
        console.log(resp_dict)
        if (resp_dict.err_code == 0) {
          console.log(resp_dict.data.file_url)
          if (callback) {
            console.log("uploadOneImage OK, return by callback")
            callback(resp_dict.data.aid)
          }
        } else {
          logError(resp)
        }
      }
    })
  })
}

// 上传二维码
const uploadQrCode = (outdoorid, callback) => {
  console.log("uploadQrCode, outdoorid is:" + outdoorid)
  qrcode.getCloudPath(outdoorid, qrCode => {
    console.log("qrCode is:" + qrCode)
    uploadOneImage(outdoorid, qrCode, aid => {
      if (callback) {
        console.log("uploadQrCode, aid is:")
        console.log(aid)
        callback(aid)
      }
    })
  })
}

// 上传活动图片
const uploadImages = (outdoorid, pics, aids, callback) => {
  console.log("uploadImages fun")
  console.log("pics are: ")
  console.log(pics)
  if (pics.length > 0) {
    uploadOneImage(outdoorid, (pics.shift()).src, res => {
      aids.push(res)
      uploadImages(outdoorid, pics, aids, callback)
    })
  } else {
    if (callback) {
      callback(aids)
    }
  }
}

// 这里确定活动应发布的版面
//  67: 周末户外活动; 90：周末休闲活动； 91:远期自助旅游; 93：技术小组
const chooseForum = (title, isTesting) => {
  console.log(title)
  console.log(isTesting)

  var fid = 67 // 默认户外
  if (isTesting) {
    fid = 93 // 技术小组版 todo 回头记得注释起来
  } else {
    var fid = 67 // 默认户外
    var day1 = new Date(title.date); // 活动日期
    var day2 = new Date(); // 当前日期
    var dayCount = (day1 - day2) / (1000 * 60 * 60 * 24) // 差了几天
    if (dayCount > 30) { // 30天算远期
      fid = 91
    } else if (title.loaded == "休闲" || title.level <= 0.8) {
      fid = 90
    } else if (title.loaded == "重装" || title.level >= 1.0) {
      fid = 67
    }
  }
  return fid
}

const NL = "\r\n"
const NL2 = "\r\n\r\n" // "&#10&#10" // "\r\n\r\n"// "&lt;br&gt;&lt;br&gt;" // "<br><br>" // 换行符

// 按照集合地点分组
const groupMembersByMeets = (meets, members) => {
  var meetMembers = []
  for (var i = 0; i < meets.length; i++) {
    meetMembers[i] = new Array();
  }
  // 遍历所有队员
  for (var j = 0; j < members.length; j++) {
    meetMembers[members[j].entryInfo.meetsIndex].push(members[j])
  }
  return meetMembers
}

// 构建队员名单，按照集合地点分组，隐藏队员号码
const buildMembersMessage = (meets, members) => {
  var message = "活动名单如下：" + NL
  var meetMembers = groupMembersByMeets(meets, members)
  meetMembers.forEach((item, index) => {
    message += "第" +(index + 1) + "）集合地点：" + meets[index].place + "，活动" + meets[index].date + " " + meets[index].time + NL
    meetMembers[index].forEach((citem, cindex) => {
      var result = buildEntryMessage(meetMembers[index][cindex].userInfo, meetMembers[index][cindex].entryInfo, false, true)
      message += result.message + NL
    })
    message += NL
  })
  message += NL
  return message
}

// 构建活动信息，以便发布活动信息到网站
const buildOutdoorMesage = (data, first, modifys, addMessage, allowSiteEntry) => {
  var message = "（以下内容由“户外报名”小程序同步发出）" + NL2
  if (addMessage && addMessage.length > 0) {
    message += addMessage + NL2
  }

  // 活动当前状态
  if (first || modifys.status) {
    message += "活动当前状态：" + NL + data.status + NL2
    if (data.status == "报名截止") {
      message += buildMembersMessage(data.meets, data.members)
      message += NL
    }
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

  // 活动介绍
  if (modifys.brief) { // 第一次在前面加信息了，这里只管后面修改的事情
    message += "活动介绍：" + NL + data.brief.disc + NL2
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
  if ((first || modifys.route) && data.route.wayPoints ) {
    message += NL + "活动路线及行程安排：" + NL
    data.route.wayPoints.forEach((item, index) => {
      message += (index + 1) + "） " + (item.date ? item.date : '当天') + " " + (item.time ? item.time : ' ') + " " + item.place + NL
    })
    message += NL
  }

  // 交通及费用 
  if (first || modifys.traffic) {
    message += NL + "交通方式及费用：" + NL
    message += data.traffic.mode
    message += "，" + data.traffic.cost
    if (data.traffic.cost != "免费"){
      message += "，" + data.traffic.money + "元，以实际发生为准"
    }
    if (data.traffic.mode!="公共交通" && data.traffic.car) {
      message += NL + "车辆信息：" + data.traffic.car.brand
      if (data.traffic.mode == "自驾" && data.traffic.car.color){
        message += "，" + data.traffic.car.color
      }
      if (data.traffic.car.number){
        message += "，车牌尾号：" + data.traffic.car.number
      }
    }
    message += NL2
  }

  // 人员限制/体力要求/是否允许空降/截止时间
  if (first || modifys.limits) {
    if (data.limits && data.limits.maxPerson) {
      message += "活动人数：限" + data.limits.personCount + "人" + NL
    }
    if (data.limits && data.limits.allowPopup) {
      message += "本活动允许空降" + NL
    } else {
      message += "本活动不允许空降" + NL
    }
    // 占坑/报名截止时间
    if (data.limits && data.limits.ocuppy && data.limits.ocuppy.date != "不限") {
      message += "占坑截止时间：活动" + data.limits.ocuppy.date + " " + data.limits.ocuppy.time + NL
    }
    if (data.limits && data.limits.entry && data.limits.entry.date != "不限") {
      message += "报名截止时间：活动" + data.limits.entry.date + " " + data.limits.entry.time + NL
    }
    // 体力要求
    if (data.title.level >= 1.0) {
      message += NL + "体力要求：要求报名人员近期应参加过强度值不小于" + data.title.level + "的活动，体力能满足本活动要求。" + NL
    }
    // 装备要求
    if (data.limits && data.limits.equipments) {
      message += NL + "活动装备要求"
      message += NL+"必须有的装备：" 
      data.limits.equipments.mustRes.forEach((item, index)=>{
        message += item + "，"
      })
      message += NL +"可以有的装备："
      data.limits.equipments.canRes.forEach((item, index) => {
        message += item + "，"
      })
      message += NL +"不能有的装备："
      data.limits.equipments.noRes.forEach((item, index) => {
        message += item + "，"
      })
      message += NL
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
  if (first) {
    message += NL + "报名须知：请到帖子末尾，用微信扫描二维码，登录小程序报名。" + NL
  } else {
    message += NL + "报名须知：请到帖子一楼，用微信扫描二维码，登录小程序报名。" + NL
  }
  if (!allowSiteEntry) { // 用当前活动表的设置
    message += "为方便领队汇总名单和后续提供微信后台消息通知，本活动不接受网站直接跟帖报名，敬请注意" + NL
  }

  return message
}

// 构建网站报名信息; isQuit:是否为退出活动； isPrint：是否为集中打印名单时调用
const buildEntryMessage = (userInfo, entryInfo, isQuit, isPrint) => {
  var message = ""
  var title = ""
  if (!isPrint) {
    message += "（本内容由“户外报名”小程序自动发出，与发帖人无关；相应责权由" + userInfo.nickName + "承担）\r\n"
  }
  if (isQuit) {
    var temp = userInfo.nickName + " 因故退出活动，抱歉！"
    message += temp
    title += temp
  } else {
    // 昵称/性别/电话（隐藏中间三位）/认路情况/同意免责/集合地点（报名状态）
    var temp = userInfo.nickName + "/" + userInfo.gender + "/"
    
    // 隐藏手机号码中间三位
    var phone = util.hidePhone(userInfo.phone.toString());
    var knowWay = entryInfo.knowWay ? "认路" : "不认路"
    temp += phone + "/" + knowWay + "/已同意免责条款/"
    if (!isPrint) {
      temp += "第" + (entryInfo.meetsIndex + 1) + "集合点"
    }
    temp += "（" + entryInfo.status + "）"

    message += "代报名：" + temp
    title += temp
  }
  return {title: title,message: message,}
}

// 发布活动
const addThread = function(outdoorid, data, isTesting, callback) {
  console.log("addThread fun")
  var temp = []
  uploadImages(outdoorid, data.brief.pics, temp, resAids => {
    console.log("resAids is:")
    console.log(resAids)
    uploadQrCode(outdoorid, resQcCode => {
      console.log("resQcCode is:")
      console.log(resQcCode)
      resAids.push(resQcCode)
      
      var fid = chooseForum(data.title, isTesting) // 要发帖的版面
      var message = buildOutdoorMesage(data, true, data.modifys, "", data.websites.lvyeorg.allowSiteEntry) // 构建活动信息
      // console.log(message)
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
          aid_list: resAids,
        },
        fail: function(error) {
          console.log(error)
          wx.showModal({
            title: '同步绿野ORG失败',
            content: '原因是：' + error.toString() + "。请稍后对活动略做修改，点击“保存修改”即可重发。",
            showCancel: false,
            confirmText: "知道了",
          })
        },
        success: function(resp) {
          console.log(resp); // resp.data.data.tid 帖子id；resp.data.data.pid 跟帖id post id
          var resp_dict = resp.data;
          if (resp_dict.err_code == 0) {
            wx.showToast({
              title: 'ORG发帖成功',
            });
            if (callback) {
              callback(resp.data.data.tid)
            }
          } else if (resp.statusCode == 200) { // 最恐惧的在这里：请求成功，但绿野org后台出错，帖子有了，但tid没有
            wx.showModal({
              title: '同步绿野ORG异常',
              content: "可能已发帖到绿野ORG网站，但得不到帖子ID，后续信息无法同步，请联系小程序作者解决。",
              showCancel: false,
              confirmText: "知道了",
            })
          } else if (resp_dict.err_code != 0) { // 发帖失败了
            getError(resp, (error) => {
              wx.showModal({
                title: '同步绿野ORG失败',
                content: '原因是：' + error + "。\r\n点击“再试一次”则再次尝试同步，点击“以后再发”则在您“保存修改”或再次进入本活动页面时重发。",
                confirmText: "再试一次",
                cancelText: "以后再发",
                success(res) {
                  if (res.confirm) {
                    console.log('用户点击确定')
                    addThread(outdoorid, data, isTesting, callback) // 立刻重发
                  } else if (res.cancel) {
                    console.log('用户点击取消') // 取消则“保存修改”或再次进入本活动页面时重发
                    // 这里要更新Outdoors表
                    // data.websites.lvyeorg.fid = fid
                    if (callback) { // 不成就返回null
                      callback(null)
                    }
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
const postMessage = (outdoorid, tid, title, message) => {
  console.log("const postMessage")
  console.log(outdoorid)
  console.log(tid)
  console.log(message)
  var token = wx.getStorageSync("LvyeOrgToken")

  wx.request({
    url: LvyeOrgURL + "add_post3.php",
    method: "POST",
    header: {
      "content-type": "application/x-www-form-urlencoded"
    },
    data: {
      token: token,
      tid: tid,
      // pid: "44440649", // todo 没用
      subject: title, // 
      message: encodeURI(message),
    },
    success: function(resp) {
      console.log("跟帖成功：")
      console.log(resp)
      var resp_dict = resp.data;
      if (resp_dict.err_code == 0) {
        wx.showToast({
          title: 'ORG同步成功',
        });
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
                postMessage(outdoorid, tid, title, message) // 立刻重发
              } else if (res.cancel) {
                console.log('用户点击取消') // 取消则“保存修改”或再次进入本活动页面时重发
                // 这里要更新Outdoors表
                cloudfun.pushOutdoorLvyeWaiting(outdoorid, message)
              }
            }
          })
        })
      }
    }
  })
}

// 把未发布出去的信息加到waitings中
const add2Waitings = (outdoorid, message) => {
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
  cloudfun.pushOutdoorLvyeWaiting(outdoorid, message)
}

// 同步绿野org网站等待要发送的信息
const postWaitings = (outdoorid, tid, callback) => {
  console.log("const postWaitings")
  dbOutdoors.doc(outdoorid).get().then(res => {
    if (res.data.websites && res.data.websites.lvyeorg.waitings) {
      postWaitingsInner(outdoorid, tid, res.data.websites.lvyeorg.waitings, callback)
    }
  })
}

// 增加一个内部函数，减少数据库访问
const postWaitingsInner = (outdoorid, tid, waitings, callback) => {
  console.log("const postWaitingsInner")
  console.log(outdoorid)
  console.log(tid)
  console.log(waitings.length)
  if (waitings.length > 0) {
    var waiting = waitings.shift()
    postOneWaiting(outdoorid, tid, waiting, () => {
      console.log(waitings.length)
      postWaitingsInner(outdoorid, tid, waitings, callback) // 这么来保证顺序
    })
  } else if (waitings.length == 0) {
    if (callback) {
      callback()
    }
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
    success: function(resp) {
      var resp_dict = resp.data;
      console.log(resp_dict)
      if (resp_dict.err_code == 0) {
        cloudfun.shiftOutdoorLvyeWaitings(outdoorid, res=>{
          if (callback) { // 回调
            callback()
          }
        })
      } else {
        logError(resp)
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

// 日志输出绿野org网站反馈的错误信息
const logError = (resp) => {
  getError(resp, error => {
    console.log(error)
  })
}

// 弹窗绿野org网站反馈的错误信息
const showErrorModel = (resp) => {
  getError(resp, error => {
    showModal(error)
  })
}

// 弹窗显示错误信息
const showModal = (error) => {
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
  logError: logError,
  showErrorModel: showErrorModel,

}