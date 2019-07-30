const app = getApp()
const template = require('../../utils/template.js')

Page({

  data: {
    status:"", // 当前活动状态
    meets: [], //集合点，可加多个
    index: 0, // 当前要处理的index
    hasModified: false,
    od:null,  
  
    showAction: false, 
    Actions: [{
        name: '编辑',
        subname: "编辑当前集合点"
      },
      { 
        name: '删除', 
        subname: "删除当前集合点"
      },
      {
        name: '追加(前面)',
        subname: "在前面追加集合点"
      },
      {
        name: '追加(后面)',
        subname: "在后面追加集合点"
      },
    ],
  },

  onCancelAction() {
    this.setData({
      showAction: false
    });
  },

  onSelectAction(e) {
    console.log(e); // todo e.detail == name 
    const self = this
    if (e.detail.name == "删除") {
      self.data.meets.splice(self.data.index,1)
      this.setData({
        meets: self.data.meets, 
        hasModified:true,
      })
    } else {
      var url = "EditOneMeet?index=" + this.data.index + "&action="
      if (e.detail.name == "编辑") {
        url += "edit"
      } else if (e.detail.name == "追加(前面)") {
        url += "addBefore"
      } else if (e.detail.name == "追加(后面)") {
        url += "addAfter"
      }
      wx.navigateTo({
        url: url,
      })
    }
    this.setData({
      showAction: false
    });
  },

  // 弹出选项：在前面追加，在后面追加，编辑，删除
  clickMeet: function(index, e) {
    console.log(index) // 这里知道要处理哪个集合点
    this.setData({
      index: index,
      showAction: true,
    });
  },

  onLoad: function(options) {
    console.log("onLoad")
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    let od = prevPage.data.od
    this.setData({
      status: od.status,
      meets: od.meets,
      od:od, 
    })
    this.rebuildClickMeetFun()
  },

  rebuildClickMeetFun: function() {
    for (var i = 0; i < this.data.meets.length; i++) {
      // 这里动态创建给click cell的函数
      let index = i; // 还必须用let才行
      this["clickMeet" + index] = (e) => {
        this.clickMeet(index, e)
      }
    }
  },

  onUnload: function () {
    console.log("onUnload()")
    this.save()
  },

  save: function(e) {
    console.log("save")
    if(e)
      template.savePersonFormid(app.globalData.personid, e.detail.formId, null)

    const self = this;
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];

    // 这里把数据写回去
    if(this.data.hasModified) {
      prevPage.setData({
        "od.meets": self.data.meets,
      })
      this.data.od.saveItem("meets")

      this.setData({
        hasModified:false
      })
    }

    // 如果只有一个集合地点，则默认这个了
    if (self.data.meets.length == 1) {
      prevPage.setData({
        "myself.entryInfo.meetsIndex": 0,
      })
    }
    // 检查一下可否发布
    prevPage.checkPublish()
  },

  giveup(e) {
    console.log("giveup()")
    template.savePersonFormid(app.globalData.personid, e.detail.formId, null)
    this.data.hasModified = false
    wx.navigateBack({})
  },

  // 把输入的点，加到meets中
  addMeet: function(e) {
    template.savePersonFormid(app.globalData.personid, e.detail.formId, null)
    wx.navigateTo({
      url: "EditOneMeet?action=addLast",
    })
  },

})