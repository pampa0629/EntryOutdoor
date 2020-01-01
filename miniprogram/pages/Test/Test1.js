// miniprogram/pages/Test/Test1.js
// const regeneratorRuntime = require('regenerator-runtime')
const lvyeorg = require('../../utils/lvyeorg.js')
const person = require('../../utils/person.js')
const cloudfun = require('../../utils/cloudfun.js')
const util = require('../../utils/util.js')
const promisify = require('../../utils/promisify.js')
const facetools = require('../../utils/facetools.js')
// const tencentcloud = require("../../../../tencentcloud-sdk-nodejs");
// const tencentcloud = require("tencentcloud-sdk-nodejs");

const app = getApp()
wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
const dbPersons = db.collection('Persons')
const _ = db.command

Page({

  /**
   * 页面的初始数据
   */
  data: {
    // size: app.globalData.size,
    
    size: wx.getStorageSync("globalSize"),
    // time: 30 * 60 * 60 * 1000,
    time: 425856000.0000894
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onReady(options) {
    wx.setStorageSync("globalSize", "large")
    console.log("size:", this.data.size)
  },

  async test1() {
    
    const res = await this.test1_1()
    console.log("res:",res)
  },

  async test1_1() {
    try {
      var outdoorid = "2324"
      let res = await dbOutdoors.doc(outdoorid).get()
      console.log(res)
      return true
    } catch (err) {
      console.log(err)
      return false
    }
  },

  async test12() {
    console.log("test1()")
    var ids = []
    ids.push("92390494")
    ids.push("W7Yse92AWotkW2-0")
    for (let id of ids) {
      console.log("id", id)
      const res = await cloudfun.opPersonItem(id, "test", "nothing", "push")
      console.log("res", res)
    }

    // ids.forEach(async(item, index) => {
    //   console.log("index", index)
    //   console.log("id:", item)
    //   const res = await person.getPersonData(item)
    //   if (res) {
    //     console.log("res", res)
    //   }
    // })

    console.log("end test1()")
  },

  async test11() {
    console.log("test1()")
    var ids = []
    ids.push("92390494")
    ids.push("W7Yse92AWotkW2-0")
    for (let id of ids) {
      console.log("id", id)
      const res = await person.getPersonData(id)
      console.log("res", res)
    }

    // ids.forEach(async(item, index) => {
    //   console.log("index", index)
    //   console.log("id:", item)
    //   const res = await person.getPersonData(item)
    //   if (res) {
    //     console.log("res", res)
    //   }
    // })

    console.log("end test1()")
  },

  async test1_bak() {
    console.log("test1()")
    // const posts = await lvyeorg.loadPosts(44434792, 0)
    // console.log("posts",posts)
    var out = ""

    for (var i = 0; i < 3; i++) {
      console.log("begin:", i)
      out += "#######begin:" + i + "-----"
      out += await this.test2()
      console.log("end:", i)
      out += "-----" + "end:" + i + "#######"
    }
    wx.showModal({
      content: out,
    })

  },

  async test_bak() {
    var ids = []
    ids.push({
      id: "W7Yse92AWotkW2-0",
      n: 0
    })
    ids.push({
      id: "W7YuEJ25dhqgCto_",
      n: 1
    })
    ids.push({
      id: "W7Yv8Z25dhqgCt8g",
      n: 2
    })

    var out = ""
    for (let id of ids) {
      const res = await person.getPersonData(id.id)
      out += res.data._id + ":" + id.n + "====="
      console.log(res.data._id, id.n)
    }
    return out

    // ids.forEach(async(item, index) => {

    // })
  },

  reLeader() {
    var id = "890198e15d4b85d60e7c6a3a4031c360"
    dbOutdoors.doc(id).get().then(res => {
      if (res.data.members[0].personid != res.data.leader.personid) {
        res.data.members.unshift(res.data.leader)
        console.log(res.data.members)
        cloudfun.opOutdoorItem(id, "members", res.data.members, "")
      }
    })
  },

  async subscribers() {
    const res = await dbPersons.doc("W7bJGZ25dhqgC5GG").get()
    const subs = res.data.subscribers
    console.log("subs:", subs)
    var arr = Object.getOwnPropertyNames(subs)
    console.log("arr:", arr)
    for (let id of arr) {
      console.log("id:", id)
      console.log("sub:", subs[id])
    }
  },

  tapUndefined() {
    console.log("tapUndefined()")
    console.log("undef:", this.undef)
    wx.setStorageSync("undef", decodeURIComponent(this.undef))
    var value = wx.getStorageSync("undef")
    console.log("value:", value)

    if (value) {
      console.log("if undef:", this.undef, value)
    }
  },

  async tapLocation() {
    console.log("wx.startLocationUpdateBackground:", wx.startLocationUpdateBackground)
    const locationStart = promisify(wx.startLocationUpdateBackground)
    const resStart = await locationStart()
    console.log("location start:", resStart)

    // const locationChange = promisify(wx.onLocationChange)
    // const location = await locationChange()
    // console.log("location:", location)

    wx.onLocationChange(function(res) {
      console.log('location change', res)
    })
  },

  async tapPython() {
    const request = promisify(wx.request)

    const env = "outdoor-entry"
    const cloudUrl =
      // "cloud://outdoor-entry.6f75-outdoor-entry-1257647001/Outdoors/25c59b425d50e53e1201b1f13f21aff3/1567070269630.jpg"

      "cloud://outdoor-entry.6f75-outdoor-entry-1257647001/Outdoors/25c59b425d50e53e1201b1f13f21aff3/1567151954384.jpg"

    const resTemp = await wx.cloud.getTempFileURL({
      fileList: [cloudUrl]
    })

    console.log(resTemp)
    const tempUrl = resTemp.fileList[0].tempFileURL
    console.log(tempUrl)

    let res = await request({
      url: "https://service-q0d7fjgg-1258400438.gz.apigw.tencentcs.com/release/helloworld?url=" + tempUrl,
      method: "POST",
      // header: {
      //   "content-type": "application/x-www-form-urlencoded"
      // },
    })
    console.log(res.data)

    let resPsn = await dbPersons.doc(app.globalData.personid).get()
    const code = resPsn.data.facecodes[0].code
    // var dist = this.getDist2(code, code)
    var dist = this.getDist2(res.data, code)
    console.log("dist:", dist)

  },

  async getDist(code1, code2) {
    const request = promisify(wx.request)
    const codes = {
      code1: code1,
      code2: code2
    }
    let res = await request({
      url: "https://service-mev8pzq8-1258400438.gz.apigw.tencentcs.com/release/test",
      method: "POST",
      // body: JSON.stringify(codes)

      // body: {
      //   hehe:"hehe,body"
      //   },
      header: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body: {
        haha: "haha",
      }
    })
    console.log("dist res:", res)
    return res.data

    // dist = np.sqrt(np.sum(np.square(np.subtract(emb1, emb2))))

  },

  getDist2(code1, code2) {
    // dist = np.sqrt(np.sum(np.square(np.subtract(emb1, emb2))))
    var sum = 0
    for (var i = 0; i < 512; i++) {
      var sub = code1[i] - code2[i]
      var square = sub * sub
      sum += square
    }
    return Math.sqrt(sum)
  },

  async tapKET() {
    const url = "http://order.etest.net.cn/order/mySignUp" // "http://order.etest.net.cn/13Index?articleId=3261"
    if(!this.cookies) {
      this.cookies = ""
    }
    const res = await promisify.request({
      url: url,
      method: "GET",
      header: {
        'content-type': 'text/html; charset=utf-8', // 默认值
        'cookie': this.cookies,
      },
      data: {
        username: "50463253@qq.com",
        password: "xx123zzm"
      },
    })
    console.log(res)
    this.cookies = res.cookies
  },

  async tapCallback() {
    // try {
    //   let res = await promisify.showModal({
    //     title: '',
    //     content: '',
    //   })
    //   console.log("res:", res)
    // }catch(err) {
    //   console.log("err:",err)
    // }

    // var faces = {}
    // faces["a"] = {a:"a",d:"d"}
    // faces["b"] = "b"
    // var c = "cc"
    // faces.c = "c"
    // faces[c] = "ccc"
    // console.log("faces:", faces)
    // console.log("length1:", Object.getOwnPropertyNames(faces).length)
    // console.log("length2:", Object.keys(faces).length)

    // this.query()
    // this.calc2()
    const myModel = promisify.promise(wx.showModal)
    let res = await myModel({
      title: 'hehe',
      content: 'dasd',
    })
    console.log(res)
  },

  calc2() {
    var num = 0.2
    var counts = [1,2,3]
    for(var i in counts) {
      num = Math.sqrt(num)
      console.log("i:", num)
    }
  },

  

  async calc() {
    let res = await dbPersons.doc("W7cw8J25dhqgDMHA").get()
    console.log("res:",res)
    const code1 = res.data.facecodes["17921638"].code
    console.log("code1:", code1)

    let resOd = await dbOutdoors.doc("5d262bd45d7796f7173307fc634918a4").get()
    
    // console.log("code2:", code2)

    var t1 = new Date().getTime()
    for (var id in resOd.data.faces["9555734"].codes) {
      const code2 = resOd.data.faces["9555734"].codes[id]
      var dist = facetools.getDist(code1, code2)
      console.log("dist:", dist)
    }
    
    var t2 = new Date().getTime()
    
    console.log("time:", t2 - t1)
    
  },

  async query() {
    var t1 = new Date().getTime()
    // "5d262bd45d7796f7173307fc634918a4"
    let codes = await facetools.getMemFacecodes("5d262bd45d7796f7173307fc634918a4")
    var t2 = new Date().getTime()
    console.log("codes:", codes)
    console.log("time:", t2-t1)
  },

  // _id: 

  async tapCheck() {
    console.log("tapCheck()")
    var text = "特3456书yuuo莞6543李zxcz蒜7782法fgnv级"
    var text2 = "完2347全dfji试3726测asad感3847知qwez到"
    var text3 = "特3456书yuuo莞6543李zxcz蒜7782法fgnv级天安门约架健德桥东北角，地铁十号线健德桥A口或C口出至路对面（马兰拉面前）地铁6号线五路居站对面，即地铁西北口（A出口）出，过街天桥到四环对面（四环西侧）活动性质及职责定位"
    var res = await cloudfun.checkMsg(text3)
    console.log("res:",res)
  },

  async tapCheck2() {
    const res = await wx.cloud.callFunction({ name: 'getAccessToken' })
    console.log("res:",res)
    var token = JSON.parse(res.result).access_token
    console.log("token:", token)

    var text = "特3456书yuuo莞6543李zxcz蒜7782法fgnv级"
    var text2 = "完2347全dfji试3726测asad感3847知qwez到"
  
    var url = "https://api.weixin.qq.com/wxa/msg_sec_check?access_token=" + token
    let res2 = await promisify.request({
      url: url,
      method: 'POST',
      // header: {
      //   "content-type": "application/x-www-form-urlencoded"
      // },
      data: {
        content: text2,
      },
      // content: text,
      // data: {
      //   token: token,
      //   code: res.code,
      // }
    })
    console.log("res2:", res2)
  },

  tapDate() {
    var str2 = "2019-10-19"
    var date2 = new Date(str2)
    console.log("date2:", date2)
    var hm = "05:16"

    date2.setHours(hm.split(":")[0])
    date2.setMinutes(hm.split(":")[1])
    console.log("date2:", date2)

  },

  tapNotice1() {
    console.log("tapNotice1()")
    wx.requestSubscribeMessage({
      tmplIds: ['gQtSQmltmXrOFeAcvOfXFVsRGv7v9S6YX6467rDoSMc', 
      "CjoAXZpefhPo6IFgxvPWlx8xoFn08tGe4ijcZE-2Cdk",
      "1u0TixqNPN-E4yzzaK8LrUooofZAgGoK3_EwrrIG_Lg"
       ],
      success(res) { 
        console.log("success: ", res)
      }, 
      complete(res){
        console.log("complete: ", res)
      }
    })

    this.tapNotice2()
  },

  tapNotice2() {
    console.log("tapNotice2()")
    wx.requestSubscribeMessage({
      tmplIds: ['1O-Y8wh7U7iNa_g3LmKiAMG5XFMosxzeDcf_Mivlt-Q',
        "f6L4oJoqw0psVcxEI0eQWSv_-SpEdhNJ6-MSFzzQ-SI",
        "1u0TixqNPN-E4yzzaK8LrUooofZAgGoK3_EwrrIG_Lg"
      ],
      success(res) {
        console.log("success2: ", res)
      },
      complete(res) {
        console.log("complete2: ", res)
      }
    })
  },

  async tapSend() {
    console.log("tapSend()")
    // {
    //   number01: {
    //     value: '339208499'
    //   },
    //   date01: {
    //     value: '2015年01月05日'
    //   },
    //   site01: {
    //     value: 'TIT创意园'
    //   },
    //   site02: {
    //     value: '广州市新港中路397号'
    //   }
    // },

    // "data": {
    //   "thing1": {
    //     "value": "内容"
    //   },
    //   "number2": {
    //     "value": 20
    //   }

    // tmplIds: ['gQtSQmltmXrOFeAcvOfXFVsRGv7v9S6YX6467rDoSMc',  报名成功通知
    // 活动名称    // { { thing2.DATA } }
    // 姓名    // { { name1.DATA } }
    // 地址    // { { thing5.DATA } }
    // 活动时间    // { { date4.DATA } }
    // 活动场馆    // { { thing3.DATA } }

    // const res = await wx.cloud.callFunction({ name: 'getAccessToken' })
    // console.log(res)
    const res = await wx.cloud.callFunction({
      name: 'sendMessage', // 云函数名称
      data: {
        openid: "ogNmG5KFPConlOTeQNYciQrW5SE4",
        // access_token: JSON.parse(res.result).access_token,
        tempid: 'gQtSQmltmXrOFeAcvOfXFVsRGv7v9S6YX6467rDoSMc',
        page: "pages/MyInfo/MyInfo",
        data: {
              "thing2": {"value": "活动名称"},
              "name1": {"value": "领队姓名"},
              "thing5": { "value": "活动地址" },
              "date4": { "value": "2019-4-23" },
              "thing3": { "value": "活动场馆" },
                      },
      },
    })
    console.log("res",res)

  },

})