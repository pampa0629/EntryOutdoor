const app = getApp()
const util = require('../../utils/util.js')

Page({

  data: {
    size: app.globalData.setting.size, // 界面大小

    hasModified: false,
    od: null,
    status:null, // 报名状态，活动主页面传入

    // 童军的
    childs: [], //童军，可加多个
    childIndex: 0, // 当前要处理的index    
    showChildAction: false,
    ChildActions: [{
        name: '编辑',
        subname: "编辑当前童军"
      },
      {
        name: '删除',
        subname: "删除当前童军"
      },
    ],

    // 家长的
    parents: [], //童军，可加多个
    parentIndex: 0, // 当前要处理的index
    showParentAction: false,
    ParentActions: [{
        name: '编辑',
        subname: "编辑当前家长"
      },
      {
        name: '删除',
        subname: "删除当前家长"
      },
    ],
  },

  onCancelChildAction() {
    this.setData({
      showChildAction: false
    });
  },

  onCancelParentAction() {
    this.setData({
      showParentAction: false
    });
  },

  onSelectChildAction(e) {
    console.log(e); // todo e.detail == name 
    const self = this
    if (e.detail.name == "删除") {
      self.data.childs.splice(self.data.childIndex, 1)
      this.setData({
        childs: self.data.childs,
        hasModified: true,
      })
    } else {
      var url = "AddOneChild?index=" + this.data.childIndex + "&action="
      if (e.detail.name == "编辑") {
        url += "edit"
      }
      wx.navigateTo({
        url: url,
      })
    }
    this.setData({
      showChildAction: false
    })
  },

  onSelectParentAction(e) {
    console.log(e); 
    const self = this
    if (e.detail.name == "删除") {
      self.data.parents.splice(self.data.parentIndex, 1)
      this.setData({
        parents: self.data.parents,
        hasModified: true,
      })
    } else {
      var url = "AddOneParent?index=" + this.data.parentIndex + "&action="
      if (e.detail.name == "编辑") {
        url += "edit"
      }
      wx.navigateTo({
        url: url,
      })
    }
    this.setData({
      showParentAction: false
    })
  },

  addChild() {
    wx.navigateTo({
      url: "AddOneChild?action=addLast",
    })
  },

  addParent() {
    wx.navigateTo({
      url: "AddOneParent?action=addLast",
    })
  },

  // 弹出选项：编辑，删除
  clickChild: function (index, e) {
    console.log(index) // 这里知道要处理哪个集合点
    this.setData({
      childIndex: index,
      showChildAction: true,
    })
  },

  clickParent: function (index, e) {
    console.log(index) // 这里知道要处理哪个集合点
    this.setData({
      parentIndex: index,
      showParentAction: true,
    })
  },

  onShow() {
    this.setData({
      size: app.globalData.setting.size
    })
  },

  onLoad: function (options) {
    console.log("onLoad")

    if (options.status) {
      this.data.status = options.status
    }

    if (options.isMember) {
      this.data.isMember = options.isMember
    }

    // 先构建固定家长（自己）的信息
    var fix = {
      // personid: app.globalData.personid,
      nickName: app.globalData.userInfo.nickName,
      gender: app.globalData.userInfo.gender,
      phone: app.globalData.userInfo.phone
    }

    let pages = getCurrentPages() //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2]
    let od = prevPage.data.od
    this.setData({
      od: od,
      fix:fix,
    })
      
    if (prevPage.data.myself && prevPage.data.myself.childs) {
      this.setData({
        childs:prevPage.data.myself.childs, 
      })
    }

    if (prevPage.data.myself && prevPage.data.myself.parents) {
      this.setData({
        parents:prevPage.data.myself.parents,
      })
    }

    this.rebuildClickChildFun()
    this.rebuildClickParentFun()
  },

  rebuildClickChildFun: function () {
    for (var i = 0; i < this.data.childs.length; i++) {
      // 这里动态创建给click cell的函数
      let index = i; // 还必须用let才行
      this["clickChild" + index] = (e) => {
        this.clickChild(index, e)
      }
    }
  },

  rebuildClickParentFun: function () {
    for (var i = 0; i < this.data.parents.length; i++) {
      // 这里动态创建给click cell的函数
      let index = i; // 还必须用let才行
      this["clickParent" + index] = (e) => {
        this.clickParent(index, e)
      }
    }
  },

  onUnload: function () {
    console.log("onUnload()")
  },

  
  tapConfirm() {
    console.log("tapConfirm()")
    let pages = getCurrentPages()
    let prevPage = pages[pages.length - 2];
    
    prevPage.setData({
      "myself.childs":this.data.childs,
      "myself.parents":this.data.parents,
      hasModified:this.data.hasModified,
    })

    // 对于已经报名的队员，设置了之后就应该直接存起来
    if(this.data.isMember && this.data.status!="浏览中") {
      prevPage.entryOutdoorInner(this.data.status)
    }

    wx.navigateBack({})
  },

  // tapEntry() {
  //   console.log("tapEntry()")
  //   this.setBack()

  //   // 构建  myself
  //   var myself = util.createMember(app.globalData.personid, prevPage.data.userInfo, prevPage.data.entryInfo, this.data.childs, this.data.parents)
    
  //   // 调用 活动页面报名函数 
  //   prevPage.entryOutdoorInner2(this.data.status, myself)

  //   wx.navigateBack({})
  // },

  tapCancel() {
    console.log("tapCancel()")
    wx.navigateBack({})
  },


})