import Page from 'page';
const app = getApp()
const QRCode = require('../../libs/weapp-qrcode.js')
const util = require('../../utils/util.js')
const cloudfun = require('../../utils/cloudfun.js')
const template = require('../../utils/template.js')
const crypto = require('../../utils/crypto.js')
const group = require('../../utils/group.js')

const plugin = requirePlugin("WechatSI")
const manager = plugin.getRecordRecognitionManager()

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
const dbPersons = db.collection('Persons')
const dbTemp = db.collection('Temp')


Page({
  data: {
    home: false,
    formIds: [],
  },

  onLoad() {
    this.initRecord()

    var time = new Date()
    console.log("load time:" + time.toTimeString())
    dbTemp.doc(app.globalData.personid).update({
      data: {
        loadtime: time.toTimeString(),
      }
    })
    return
    setInterval(() => {
      dbTemp.doc(app.globalData.personid).update({
        data: {
          timing: (new Date()).toTimeString(),
        }
      })
    }, 10000)
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

  sendTemplate() {
    template.sendMessage("ogNmG5P3ZlT29kXGhWfGX5nC_sqA", "4f4JAb6IwzCW3iElLANR0OxSoJhDKZNo8rvbubsfgyE", "1545879624341", "", "")
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
        dbTemp.doc(app.globalData.personid).set({
          data: {
            raw: res.rawData,
            //decode: self.decode(res.rawData),
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
    var qrcode = new QRCode('canvas', {
      // usingIn: this,
      text: "https://github.com/tomfriwel/weapp-qrcode",
      width: 128,
      height: 128,
      colorDark: "#1CA4FC",
      colorLight: "white",
      correctLevel: QRCode.CorrectLevel.H,
    });
    qrcode.makeCode("test")
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
    // 开启语音输入
    var record = wx.getRecorderManager()
    record.onStop((res) => {
      console.log('recorder stop', res)

      var fs = wx.getFileSystemManager()
      var buffer = fs.readFile({
        filePath: res.tempFilePath,
        success: file => {
          console.log(file)
          var dataLen = res.fileSize
          console.log("dataLen: " + dataLen)

          /*var data = qs.stringify({
            audio: encodeURI(Buffer.from(file.data).toString("base64"))
          })
          var options = {
            url: url,
            method: 'POST',
            body: data, // body 得这么写
          }*/
          // id: AKIDOZVDdzIj5Dj5hVfPTJ5i6LSODuMPooxC
          // key: 9CF6QeeOA7sO0qQN1VkskMCn9G8sWAGI
          // id: AKIDiCUv7dM2rRlphJptqYFoAGD6rOuCr9TY
          // key: 82hCSWnrfEZmlYDm9HAnEPO8h06zfCVm

          var data = {
            Action: "SentenceRecognition",
            Data: file.data.toString("base64"),
            DataLen: dataLen,
            EngSerViceType: "16k",
            Nonce: (new Date()).getTime(),
            ProjectId: "0",
            Region: "ap-beijing",
            SecretId: "AKIDiCUv7dM2rRlphJptqYFoAGD6rOuCr9TY",
            Signature: "82hCSWnrfEZmlYDm9HAnEPO8h06zfCVm",
            SourceType: "1",
            SubServiceType: "2",
            Timestamp: Math.floor((new Date()).getTime() / 1000),
            UsrAudioKey: "",
            Version: "2018-05-22",
            VoiceFormat: "mp3",
          }
          var temp = hash_hmac(data)
          var param = qs.stringify(data)
          console.log(param)

          wx.request({
            url: "https://aai.tencentcloudapi.com",
            method: "post",
            header: {
              "content-type": "application/x-www-form-urlencoded"
            },
            data: data,
            success: function(resp) {
              console.log(resp)
            }
          })
        }
      })

    })

    const options = {
      duration: 10000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 64000,
      format: 'mp3',
      frameSize: 50
    }
    record.start(options)


  },

  startRecord_tencent() {
    console.log('startRecord_tencent')
    // 开启语音输入
    var record = wx.getRecorderManager()
    record.onStop((res) => {
      console.log('recorder stop', res)
      // wx.translateVoice({})
      const {
        tempFilePath
      } = res
      wx.cloud.uploadFile({
        cloudPath: "Persons/" + app.globalData.personid + "/" + new Date().getTime() + ".mp3",
        filePath: res.tempFilePath, // 文件路径
      }).then(res => {
        // get resource ID
        console.log(res.fileID)

        // 发给云函数
        wx.cloud.callFunction({
          name: 'tecentVoice', // 云函数名称
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
    })

    const options = {
      duration: 10000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 64000,
      format: 'mp3',
      frameSize: 50
    }
    record.start(options)


  },

  endRecord_old() {
    console.log('endRecord_old')

    // 发给云函数
    var record = wx.getRecorderManager()
    record.stop()

    // 云函数解析，返回结果

    // 展示结果
  },

  startRecord() {
    console.log('startRecord')
    manager.start({
      lang: 'zh_CN',
    })
    manager.onRecognize = (res) => {
      console.log('manager.onStop')
      let text = res.result
      this.setData({
        currentText: text,
      })
    }
    manager.onStop = (res) => {
      console.log('manager.onStop')
      let text = res.result
      wx.showModal({
        title: '识别结果',
        content: text,
      })
      
      // 得到完整识别内容就可以去翻译了
      // this.translateTextAction()
    }
  },

  endRecord() {
    console.log('endRecord')
    manager.stop()
  },

  initRecord: function () {
    console.log('initRecord')
    //有新的识别内容返回，则会调用此事件
    manager.onRecognize = (res) => {
      console.log('manager.onRecognize')
      let currentData = Object.assign({}, this.data.currentTranslate, {
        text: res.result,
      })
      this.setData({
        currentTranslate: currentData,
      })
      this.scrollToNew();
    }

    // 识别结束事件
    manager.onStop = (res) => {
      console.log('manager.onStop')
      let text = res.result
      wx.showModal({
        title: '识别结果',
        content: text,
      })

    }

    // 识别错误事件
    manager.onError = (res) => {

      this.setData({
        recording: false,
        bottomButtonDisabled: false,
      })

    }

    // 语音播放开始事件
    wx.onBackgroundAudioPlay(res => {

      const backgroundAudioManager = wx.getBackgroundAudioManager()
      let src = backgroundAudioManager.src

      this.setData({
        currentTranslateVoice: src
      })

    })
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

  tapGroup(){
    const self = this
    var groupID = "GgNmG5ANDVP5iVBK1wu8nCvyp9g0"
    group.ensureMember(groupID, app.globalData.openid, app.globalData.personid, app.globalData.userInfo)
  },

});