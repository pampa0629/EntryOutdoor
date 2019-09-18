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

  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onReady(options) {

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
    this.calc2()
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
  }

  // _id: 



})