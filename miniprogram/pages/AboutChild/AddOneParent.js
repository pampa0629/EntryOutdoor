const app = getApp()
const util = require('../../utils/util.js')
const promisify = require('../../utils/promisify.js')

Page({

  data: {
    Genders: ["GG", "MM"], // 性别

    parent: {        
      nickName:"", // 户外昵称
      //  gender, // 性别：GG/MM
      phone:"", // 手机号码
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
          parent: prevPage.data.parents[options.index],
        })
      }
    }
  },

    inputPhone: function(e) {
    console.log(e)
    this.setData({
      "parent.phone": e.detail,
      hasModified: true,
    })
  },

  // 记录输入集合点
  inputNickname: function(e) {
    console.log(e)
    this.setData({
      "parent.nickName": e.detail,
      hasModified: true,
    })
  },

  save() {
    console.log("save()",this.data.parent)
    if (this.data.hasModified && this.data.parent.phone && this.data.parent.nickName && this.data.parent.gender) {
      const self = this
      let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
      let prevPage = pages[pages.length - 2];
      if (self.data.action == "edit") {
        prevPage.setData({
          ['parents[' + self.data.index + ']']: self.data.parent,
        })
      } else {
        if (self.data.action == "addLast") {
          // 往最后追加一个集合点
          prevPage.data.parents.push(self.data.parent)
        }
        prevPage.setData({
          parents: prevPage.data.parents,
        })
        prevPage.rebuildClickParentFun()
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

  
  clickGender(e) {
    console.log(e)
    this.setData({
      "parent.gender": e.target.dataset.name,
      hasModified: true,
    })
  },

  changeGender(e) {
    console.log(e)
    const self = this
    self.setData({
      "parent.gender": e.detail,
      hasModified: true,
    })
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
