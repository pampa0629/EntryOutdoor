const app = getApp()
const util = require('../../utils/util.js')
const promisify = require('../../utils/promisify.js')

Page({

  data: {
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
      // self.setData({
      //   od: pages[pages.length - 3].data.od,
      // })
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

  // 记录输入集合点
  inputNickname: function(e) {
    console.log(e)
    this.setData({
      "child.nickName": e.detail,
      hasModified: true,
    })
  },

  save() {
    console.log("save()",this.data.child)
    if (this.data.hasModified && this.data.child.no && this.data.child.nickName) {
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
        // } else if (self.data.action == "addBefore") {
        //   prevPage.data.meets.splice(self.data.index, 0, self.data.meet)
        // } else if (self.data.action == "addAfter") {
        //   prevPage.data.meets.splice(self.data.index + 1, 0, self.data.meet)
        // }
        prevPage.setData({
          childs: prevPage.data.childs,
        })
        prevPage.rebuildClickChildFun()
      }
      // 最上面也要记得设置，以便刷新主界面
      // console.log("od:",od)
      // prevprevPage.setData({
      //   "od.meets":od.meets
      // })
      
      // od.saveItem("meets")
      this.setData({
        hasModified: false
      })
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
