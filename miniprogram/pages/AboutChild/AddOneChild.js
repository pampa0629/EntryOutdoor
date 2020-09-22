const app = getApp()
const util = require('../../utils/util.js')
const promisify = require('../../utils/promisify.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbChilds = db.collection('Childs')
const _ = db.command

Page({

  data: {
    Genders: ["GG", "MM"], // 性别

    child: {  
      no:"", // 童军号码
      nickName:"", // 户外昵称
      // gender, // 性别：GG/MM
    },
    index: -1,
    hasModified: false,
    // od:null,

    action: null, // 发起这个页面的行为
    size: app.globalData.setting.size, // 界面大小
  },

  onShow() {
    this.setData({
      size: app.globalData.setting.size
    })
  },

  onLoad: function(options) {
    console.log(options)
    const self = this
    if (options.index) {
      self.setData({
        index: options.index
      })
    }

    if (options.action) {
      self.data.action = options.action
      let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
      let prevPage = pages[pages.length - 2];
      if (self.data.action == "edit") {
        // 编辑，则先把原来的加载进来
        self.setData({
          child: prevPage.data.childs[options.index],
        })
      }
    }
  },

  // 记录输入集合点
  inputNo: function(e) {
    console.log(e)
    this.setData({
      "child.no": e.detail,
      hasModified: true,
    })
  },

  // 生成临时号码
  createTempNo() {
    var min = 1000
    var max = 9999
    var rdm = Math.floor(Math.random()*(max-min+1)+min)
    this.setData({
      "child.no":rdm
    })
  },

  // 通过号码查询得到昵称和性别
  async queryNo() {
    console.log("queryNo()",this.data.child)

    const res = await dbChilds.where({
      "no": parseInt(this.data.child.no)
    }).get()
    console.log(res)

    if(res.data.length == 0) {
      wx.showModal({
        title: '查询错误',
        content: '没有查询到这个童军号码，系统已为您生成一个临时号码；若输入错误，请重新输入',
      })
      this.createTempNo()
    } else if(res.data.length == 1) {
      this.setData({
        "child.nickName":res.data[0].nickName,
        "child.gender":res.data[0].gender,
      })
    }
  },

  // 记录输入集合点
  inputNickname: function(e) {
    console.log(e)
    this.setData({
      "child.nickName": e.detail,
      hasModified: true,
    })
  },

  clickGender(e) {
    console.log(e)
    this.setData({
      "child.gender": e.target.dataset.name,
      hasModified: true,
    })
  },

  changeGender(e) {
    console.log(e)
    const self = this
    self.setData({
      "child.gender": e.detail,
      hasModified: true,
    })
  },

  save() {
    console.log("save()",this.data.child)
    if (this.data.hasModified && this.data.child.no && this.data.child.nickName && this.data.child.gender) {
      const self = this
      let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
      let prevPage = pages[pages.length - 2];
      let prevprevPage = pages[pages.length - 3];
      // let od = this.data.od
      if (self.data.action == "edit") {
        prevPage.setData({
          ['childs[' + self.data.index + ']']: self.data.child,
        })
      } else {
        if (self.data.action == "addLast") {
          // 往最后追加一个集合点
          prevPage.data.childs.push(self.data.child)
        }
        prevPage.setData({
          childs: prevPage.data.childs,
        })
        prevPage.rebuildClickChildFun()
      }
      prevPage.setData({
        hasModified: true
      })
      this.setData({
        hasModified: false
      })
      wx.navigateBack({})
    }
  },

  onUnload: function () {
    console.log("onUnload()")
    this.save() // 自动保存
  },

  giveup() {
    this.data.hasModified = false
    wx.navigateBack({})
  },

})
