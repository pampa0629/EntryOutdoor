
const app = getApp()
const QRCode = require('../../libs/weapp-qrcode.js')
const util = require('../../utils/util.js')
const cloudfun = require('../../utils/cloudfun.js')
const crypto = require('../../utils/crypto.js')
const group = require('../../utils/group.js')
const person = require('../../utils/person.js')
const odtools = require('../../utils/odtools.js')
const outdoor = require('../../utils/outdoor.js')
const CryptoJS = require('../../libs/cryptojs.js')



// const plugin = requirePlugin("WechatSI") 
// const manager = plugin.getRecordRecognitionManager()

wx.cloud.init()
const db = wx.cloud.database({})
const _ = db.command
const dbOutdoors = db.collection('Outdoors')
const dbPersons = db.collection('Persons')
const dbTemp = db.collection('Temp')

let interstitialAd = null 
Page({
  data: {
    home: false,
    // formIds: [],
    od: null,
    a: null,
   
  },

  onLoad() {
    console.log("onLoad()")
    this.setData({
      // od: new outdoor.OD()
    })

  },

  onUnload() {
    var time = new Date()
    console.log("unload time:" + time.toTimeString())
    dbTemp.doc(app.globalData.personid).update({
      data: {
        unloadtime: time.toTimeString(),
      }
    })
  },

  tapLogin() {
    console.log("tapLogin()")
    console.log("before personid：", app.globalData.personid)
    person.ensureLogin(null, this, personid=>{
      console.log("personid:", personid)  
    })
   
    console.log("showLogin:", this.data.showLogin)
    console.log("after personid：", app.globalData.personid)
  },

  sendTemplate() {
    // template.sendMessage("ogNmG5P3ZlT29kXGhWfGX5nC_sqA", "4f4JAb6IwzCW3iElLANR0OxSoJhDKZNo8rvbubsfgyE", "1545879624341", "", "")
    // template.sendMessage("ogNmG5KFPConlOTeQNYciQrW5SE4", "IXScAdQZb_QmXCHXWCpjXwjwqii9_yOILJtCiGg1al0", "1543935782814", "", "")

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

  likeO() {
    console.log("likeO")

  },

  home() {
    const self = this
    console.log("home")
    this.setData({
      home: !self.data.home,
    })
  },

  tapWalk() {
    wx.login({
      success(resLogin) {
        console.log("login")
        console.log(resLogin)
        util.authorize("werun", "授权后才能获取步数", cb => {
          wx.getWeRunData({
            success(res) {
              const encryptedData = res.encryptedData
              cloudfun.decrypt(res.encryptedData, res.iv, resLogin.code, run => {
                console.log(run)
                var date = new Date()
                date.setTime(run.watermark.timestamp * 1000)
                console.log("数据获取时间：" + date.toLocaleString())
                var steps = ""
                run.stepInfoList.forEach((item, index) => {
                  var date = new Date()
                  date.setTime(item.timestamp * 1000)
                  var step = "日期：" + date.toLocaleString() + ", 步数：" + item.step
                  steps += step + "\r\n"
                  console.log(step)
                })
                wx.showModal({
                  title: '读取步数',
                  content: steps,
                })
              })
            }
          })
        })
      }
    })

  },

  dbRead() {
    var key = "1234"
    dbPersons.doc(app.globalData.personid).get().then(res => {
      var accept = res.data.subscribe[key]
      console.log(accept)
    })
  },

  tapScan() {
    const self = this
    wx.scanCode({
      complete: (res) => {
        console.log(res)
        var decode = CryptoJS.enc.Base64.parse(res.rawData)
        console.log(decode)
        dbTemp.doc(app.globalData.personid).set({
          data: {
            raw: res.rawData,
            //decode: self.decode(res.rawData),
            decode: decode,
            //var res = crypto.decrypt(enc, pwd)
            result: res.result,
          }
        })
      }
    })
  },

  tapDecode() {
    var str = "hello"
    var pwd = "pwd"
    var enc = crypto.encrypt(str, pwd)
    var res = crypto.decrypt(enc, pwd)
    console.log(str)
    console.log(enc)
    console.log(res)
  },

  tapCreateQrcode() {
    var url = "https://6f75-outdoor-entry-1257647001.tcb.qcloud.la#mp.weixin.qq.com/Outdoors/e47e55695d1c242605401a1545249ed5/Route/马武寨-抱犊-老龙口-九莲山-锡崖沟-张沟.gpx"
    //url += "#mp.weixin.qq.com"
    var qrcode = new QRCode('canvas0', {
      // usingIn: this,
      text: url,
      width: 128,
      height: 128,
      colorDark: "#1CA4FC",
      colorLight: "white",
      correctLevel: QRCode.CorrectLevel.H,
    });
    qrcode.makeCode(url)
    wx.showActionSheet({
      itemList: ['保存图片'],
      success: function(res) {
        console.log(res.tapIndex)
        if (res.tapIndex == 0) {
          qrcode.exportImage(function(path) {
            wx.saveImageToPhotosAlbum({
              filePath: path,
            })
          })
        }
      }
    })
  },

  startRecord2() {
    console.log('startRecord2')
    // // 开启语音输入
    // var record = wx.getRecorderManager()
    // record.onStop((res) => {
    //   console.log('recorder stop', res)

    //   var fs = wx.getFileSystemManager()
    //   var buffer = fs.readFile({
    //     filePath: res.tempFilePath,
    //     success: file => {
    //       console.log(file)
    //       var dataLen = res.fileSize
    //       console.log("dataLen: " + dataLen)

    //       /*var data = qs.stringify({
    //         audio: encodeURI(Buffer.from(file.data).toString("base64"))
    //       })
    //       var options = {
    //         url: url,
    //         method: 'POST',
    //         body: data, // body 得这么写
    //       }*/
    //       // id: AKIDOZVDdzIj5Dj5hVfPTJ5i6LSODuMPooxC
    //       // key: 9CF6QeeOA7sO0qQN1VkskMCn9G8sWAGI
    //       // id: AKIDiCUv7dM2rRlphJptqYFoAGD6rOuCr9TY
    //       // key: 82hCSWnrfEZmlYDm9HAnEPO8h06zfCVm

    //       var data = {
    //         Action: "SentenceRecognition",
    //         Data: file.data.toString("base64"),
    //         DataLen: dataLen,
    //         EngSerViceType: "16k",
    //         Nonce: (new Date()).getTime(),
    //         ProjectId: "0",
    //         Region: "ap-beijing",
    //         SecretId: "AKIDiCUv7dM2rRlphJptqYFoAGD6rOuCr9TY",
    //         Signature: "82hCSWnrfEZmlYDm9HAnEPO8h06zfCVm",
    //         SourceType: "1",
    //         SubServiceType: "2",
    //         Timestamp: Math.floor((new Date()).getTime() / 1000),
    //         UsrAudioKey: "",
    //         Version: "2018-05-22",
    //         VoiceFormat: "mp3",
    //       }
    //       var temp = hash_hmac(data)
    //       var param = qs.stringify(data)
    //       console.log(param)

    //       wx.request({
    //         url: "https://aai.tencentcloudapi.com",
    //         method: "post",
    //         header: {
    //           "content-type": "application/x-www-form-urlencoded"
    //         },
    //         data: data,
    //         success: function(resp) {
    //           console.log(resp)
    //         }
    //       })
    //     }
    //   })

    // })

    // const options = {
    //   duration: 10000,
    //   sampleRate: 16000,
    //   numberOfChannels: 1,
    //   encodeBitRate: 64000,
    //   format: 'mp3',
    //   frameSize: 50
    // }
    // record.start(options)


  },

  startRecord_tencent() {
    // console.log('startRecord_tencent')
    // // 开启语音输入
    // var record = wx.getRecorderManager()
    // record.onStop((res) => {
    //   console.log('recorder stop', res)
    //   // wx.translateVoice({})
    //   const {
    //     tempFilePath
    //   } = res
    //   wx.cloud.uploadFile({
    //     cloudPath: "Persons/" + app.globalData.personid + "/" + new Date().getTime() + ".mp3",
    //     filePath: res.tempFilePath, // 文件路径
    //   }).then(res => {
    //     // get resource ID
    //     console.log(res.fileID)

    //     // 发给云函数
    //     wx.cloud.callFunction({
    //       name: 'tecentVoice', // 云函数名称
    //       data: {
    //         voice: res.fileID,
    //       }
    //     }).then(res => {
    //       console.log(res)
    //       // 展示结果
    //       wx.showModal({
    //         title: '识别结果',
    //         content: res.result,
    //       })
    //     })
    //   })
    // })

    // const options = {
    //   duration: 10000,
    //   sampleRate: 16000,
    //   numberOfChannels: 1,
    //   encodeBitRate: 64000,
    //   format: 'mp3',
    //   frameSize: 50
    // }
    // record.start(options)


  },

  endRecord_old() {
    console.log('endRecord_old')

    // // 发给云函数
    // var record = wx.getRecorderManager()
    // record.stop()

    // // 云函数解析，返回结果

    // // 展示结果
  },

  startRecord() {
    // console.log('startRecord')
    // manager.start({
    //   lang: 'zh_CN',
    // })
    // manager.onRecognize = (res) => {
    //   console.log('manager.onStop')
    //   let text = res.result
    //   this.setData({
    //     currentText: text,
    //   })
    // }
    // manager.onStop = (res) => {
    //   console.log('manager.onStop')
    //   let text = res.result
    //   wx.showModal({
    //     title: '识别结果',
    //     content: text,
    //   })

    //   // 得到完整识别内容就可以去翻译了
    //   // this.translateTextAction()
    // }
  },

  endRecord() {
    // console.log('endRecord')
    // manager.stop()
  },

  initRecord: function() {
    console.log('initRecord')
    // //有新的识别内容返回，则会调用此事件
    // manager.onRecognize = (res) => {
    //   console.log('manager.onRecognize')
    //   let currentData = Object.assign({}, this.data.currentTranslate, {
    //     text: res.result,
    //   })
    //   this.setData({
    //     currentTranslate: currentData,
    //   })
    //   this.scrollToNew();
    // }

    // // 识别结束事件
    // manager.onStop = (res) => {
    //   console.log('manager.onStop')
    // let text = res.result
    // wx.showModal({
    //   title: '识别结果',
    //   content: text,
    // })

    // }

    // // 识别错误事件
    // manager.onError = (res) => {

    // this.setData({
    //   recording: false,
    //   bottomButtonDisabled: false,
    // })

    // }

    // // 语音播放开始事件
    // wx.onBackgroundAudioPlay(res => {

    //   const backgroundAudioManager = wx.getBackgroundAudioManager()
    //   let src = backgroundAudioManager.src

    //   this.setData({
    //     currentTranslateVoice: src
    //   })

    // })
  },

  uploadVoice() {
    wx.chooseVideo({
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      camera: 'back',
      success(res) {
        console.log(res.tempFilePath)
        wx.cloud.uploadFile({
          cloudPath: "Persons/" + app.globalData.personid + "/" + new Date().getTime() + ".wav",
          filePath: res.tempFilePath, // 文件路径
        }).then(res => {
          // get resource ID
          console.log(res.fileID)

          // 发给云函数
          wx.cloud.callFunction({
            name: 'baiduVoice', // 云函数名称
            data: {
              voice: res.fileID,
            }
          }).then(res => {
            console.log(res)
            // 展示结果
            wx.showModal({
              title: '识别结果',
              content: res.result,
            })
          })
        })
      }
    })
  },

  tapGroup() {
    const self = this
    // GgNmG5ApyZgxkkbDndLPz_5Odl6U GgNmG5ANDVP5iVBK1wu8nCvyp9g0
    var groupID = "GgNmG5ApyZgxkkbDndLPz_5Odl6U"
    group.ensureMember(groupID, app.globalData.openid, app.globalData.personid, app.globalData.userInfo)
    person.adjustGroup(app.globalData.personid, groupID)
  },

  tapAcc() {
    console.log("tapAcc")
    wx.onGyroscopeChange(function(res) {
      console.log(res)
      var t = Math.sqrt(Math.pow(res.x, 2) + Math.pow(res.y, 2) + Math.pow(res.z, 2))
      var acc = {
        x: res.x,
        y: res.y,
        z: res.z,
        t: t
      }
      //if (t > 1.2) {
      dbTemp.doc(app.globalData.personid).update({
        data: {
          accs: _.push(acc)
        }
      })
      console.log(acc)
      // }
    })
  },

  tapEndTime() {
    var time = odtools.calcRemainTime("2019-02-11", {
      date: "不限",
      time: "21:00"
    }, false)
    console.log(time)
  },

  tapMofangLogin() {
    console.log("tapMofangLogin()")
    const self = this
    // var cookie ="dyh_userid=3166998;dyh_password=d17476a155a43782e1f24e1b0f0e57e6" 50463253
    //  var cookie = "dyh_userid=3917317;dyh_password=d17476a155a43782e1f24e1b0f0e57e6" // zengzhiming
    var cookie = ""
    if (self.data.mofang_pid) {
      cookie += self.data.mofang_pid // + ";"  
    } 
    // cookie += self.data.cookies0 // + ";"
    // cookie += self.data.cookies1
    console.log("cookie: " + cookie)

    wx.request({
      url: "http://www.doyouhike.net/user/login",
      method: 'POST',
      header: {
        // "content-type": "application/x-www-form-urlencoded"
        "content-type": "application/x-www-form-urlencoded",
        // 'cookie': JSON.stringify(cookie),
        'Cookie': cookie,
        // Accept: text / html, application/xhtml+xml,application/xml; q=0.9, image/webp,image/apng, */*;q=0.8,application/signed-exchange;v=b3
        // Accept-Encoding: gzip, deflate
        // Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
        "cache-control": "max-age=0",
        // "connection": "keep-alive",
        // Content-Length: 44
        // Content-Type: application/x-www-form-urlencoded
        // "host": "www.doyouhike.net",
        // Origin: null
        // Upgrade-Insecure-Requests: 1
        // "user-agent":"Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Mobile Safari/537.36",
      },
      data: {
        username: "zengzhiming@supermap.com",
        password: "xx123zzm"
        // url: "/my"
      },
      fail: function(error) {
        console.log("fail")
        console.log(error)
      },
      success: function(res) {
        console.log("success")
        console.log(res)
        if (res.data.indexOf("pampa") > 0 || res.data.indexOf("攀爬") > 0) {
          console.log("login OK")
          console.log(res.data)
        }
        const c = res.cookies
        console.log(c)
        var c0 = c[0].split(";")[0]
        if (c0.indexOf("PHPSESSID") >= 0) {
          self.setData({
            "mofang_pid": c0,
          })
        }
      }
    })
  },

  // http://www.doyouhike.net/event/yueban/detail/6426077

  tapMofangEntry() {
    console.log("tapMofangEntry()")
    const self = this
    var entry = {
      'realName': "pampa", //真实姓名
      'mobile': "13693607590", //手机号码
      'nodeID': "6426258", //活动id
      'insuranceName': "youban", //保险名称
      'insuranceNumber': "123312132", //保险单号
      'contacterName': "aling", //紧急联系人
      'contacterTel': "13693607590", //紧急联系电话
      'remark': "测试测试测试测试测试" //活动留言
    }
    var cookie = "" // "dyh_userid=3917317;dyh_password=d17476a155a43782e1f24e1b0f0e57e6;" // zengzhiming
    cookie += self.data.cookies0 + ";"
    cookie += self.data.cookies1
    console.log(cookie)

    // http://www.doyouhike.net/event/yueban/apply_join?realName=%E6%9B%BE%E5%BF%97%E6%98%8E&mobile=13693607590&nodeID=6426258&insuranceName=&insuranceNumber=&contacterName=%E5%B0%8F%E7%81%B5%E9%80%9A&contacterTel=13693607590&remark=
    var url = "http://www.doyouhike.net/event/yueban/apply_join?"
    url += "realName=" + "pampa"
    url += "&mobile=" + "13693607590"
    url += "&nodeID=" + "6426258"
    url += "&insuranceName=" + "youban"
    url += "&insuranceNumber=" + "123312132"
    url += "&contacterName=" + "aling"
    url += "&contacterTel=" + "13693607590"
    url += "&remark=" + ""
    console.log(JSON.stringify(self.data.cookies))
    wx.request({
      url: url,
      method: 'GET',
      header: {
        'content-type': 'text/html; charset=utf-8', // 默认值
        'cookie': cookie,
      },
      data: JSON.stringify(entry),
      fail: function(error) {
        console.log(error)
      },
      success: function(res) {
        console.log(res)
        console.log(res.data)
      }
    })
  },

  tapMofangMain() {
    const self = this
    wx.request({
      // url: "http://www.doyouhike.net/mobile/forum/index/topic_list?slug=city&city_id=110000",
      url: "http://www.doyouhike.net/my",
      method: 'GET',
      header: {
        "content-type": "application/x-www-form-urlencoded",
        'cookie': self.data.cookies,
      },
      data: {
        // PHPSESSID: self.data.mofang.PHPSESSID,
        // dyh_lastactivity: self.data.mofang.dyh_lastactivity,
      },
      fail: function(error) {
        console.log(error)
      },
      success: function(res) {
        console.log(res)
        console.log(res.data)
      }
    })
  },

  tapMofangOutdoor() {
    const self = this
    wx.request({
      url: "http://www.doyouhike.net/event/yueban/detail/6414682",
      method: 'POST',
      header: {
        "content-type": "application/x-www-form-urlencoded"
      },
      data: {
        PHPSESSID: self.data.mofang.PHPSESSID,
        dyh_lastactivity: self.data.mofang.dyh_lastactivity,
      },
      fail: function(error) {
        console.log(error)
      },
      success: function(res) {
        console.log(res)
        console.log(res.data)
      }
    })
  },

  tapChooseFile() {
    const fs = wx.getFileSystemManager()
    var newPath = wx.env.USER_DATA_PATH + "/abc"
    fs.mkdir({
      dirPath: newPath,
      complete: res => console.log(res)
    })
  },

  myFunction(a) {
    console.log("arguments.length:" + arguments.length)
    console.log("arguments0:" + arguments[0])
    console.log("arguments:")
    console.log(JSON.stringify(arguments))
    console.log("arguments type:" + typeof arguments)
    var result = 1
    for (var x in arguments) {
      console.log("x:" + arguments[x])
      result = arguments[x] * result
    }
    return result * arguments.length;
  },

  tapOD() {
    // this.data.od.load("57896b495cf64f1e0b873e3675d01598", callback => {
    //   this.setData({
    //     od: this.data.od
    //   })
    // })
  },

  find(objs, name, id) {
    console.log("name:" + name)
    console.log("id:" + id)
    objs.forEach((item, index) => {
      console.log(item)
      // self["editMust" + index] = () => {
      let temp = item[name]
      // console.log(item[name])
      // console.log(item[name.toString()])

      // console.log(item["id"])
      // console.log(item.id)
      console.log(temp)
      var res = temp == id ? true : false
      console.log(res)

      if (res) {
        return item
      }
    })
  },

  find(objs, name, id) {
    console.log("name:" + name)
    console.log("id:" + id)
    for (var index in objs) {
      console.log(index)
      if (objs[index][name] == id) {
        return objs[index]
      }
    }
    return null
  },

  getValue(obj, name) {
    console.log(obj)
    console.log(name)
    var items = name.split(".")
    var result = obj
    for (var x in items) {
      result = result[items[x]]
    }
    console.log(result)
    return result
  },

  tapCloud() {
    var oldobjs = {
      id1: {
        a: "a"
      },
      id2: {
        a: "a"
      },
      id3: {
        a: "a"
      },
      id4: {
        a: "a"
      },
    }
    var objs = Object.getOwnPropertyNames(oldobjs)
    console.log(objs)

    console.log(objs.length)
    console.log(objs[0])
    console.log(objs.id2)
    console.log(objs["id4"])
    delete oldobjs[objs[2]]
    console.log(oldobjs)
    console.log(objs.length)
    console.log(objs)

  },

  tapDBArray() {
    console.log("tapDBArray()")
    var outdoorid = "3b07eb945d0ef173066862c55bcbe6ed"
    dbOutdoors.doc(outdoorid).get().then(res => {
      console.log(res.data.route)
      wx.cloud.callFunction({
        name: 'dbSimpleUpdate', // 云函数名称
        data: {
          table: "Temp",
          id: app.globalData.personid,
          item: "route",
          command: "",
          value: res.data.route
        }
      })
    })


  },

  tapCopy() {
    console.log("tapCopy()")
    var outdoors = [{ id: "1" }, { id: "" }, { id: "1" }, { id: "2" }, { id: "1" }, { id: "1" }]
    // var outdoors = [{ id: "" }, { id: "1" }, { id: "2" }]
    var value = {id:"1"}
    
    var index = -1
    do { // 循环保证清楚干净
      index = util.findIndex(outdoors, "id", value.id)
      console.log(outdoors, "id", value, index)
      if (index>=0) {
        outdoors.splice(index, 1)
      }
      count++
    } while (index >= 0 ) 

  },

});