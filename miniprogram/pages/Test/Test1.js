// miniprogram/pages/Test/Test1.js
// const regeneratorRuntime = require('regenerator-runtime')
const lvyeorg = require('../../utils/lvyeorg.js')
const person = require('../../utils/person.js')
const cloudfun = require('../../utils/cloudfun.js')
const util = require('../../utils/util.js')
const promisify = require('../../utils/promisify.js')


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
    console.log("test1()")
    var ids = []
    ids.push("92390494")
    ids.push("W7Yse92AWotkW2-0")
    for (let id of ids) {
      console.log("id", id)
      // const res = await person.getPersonData(id)
      const res = await cloudfun.opPersonItem_a(id, "test", "nothing","push")
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
    console.log("subs:",subs)
    var arr = Object.getOwnPropertyNames(subs)
    console.log("arr:", arr)
    for (let id of arr) {
      console.log("id:",id)
      console.log("sub:", subs[id])
    }
  },

  tapUndefined(){
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

    wx.onLocationChange(function (res) {
      console.log('location change', res)
    })
  }


})