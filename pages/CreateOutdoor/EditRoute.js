Page({

  data: {
    route: [], //活动路线，可加多个途经点
    index: 0, // 当前要处理的index
    hasModified:false,

    showAction: false,
    Actions: [{
      name: '编辑',
      subname: "编辑当前途经点"
    },
    {
      name: '删除',
      subname: "删除当前途经点"
    },
    {
      name: '追加(前面)',
      subname: "在前面追加途经点"
    },
    {
      name: '追加(后面)',
      subname: "在后面追加途经点"
    },
    ],
  },

  onCancelAction() {
    this.setData({
      showAction: false
    });
  },

  onSelectAction(e) {
    console.log(e); 
    const self = this
    if (e.detail.name == "删除") {
      self.data.route.splice(self.data.index, 1)
      this.setData({
        route: self.data.route,
        hasModified: true,
      })
    } else {
      var url = "EditOneStop?index=" + this.data.index + "&action="
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
  clickStop: function (index, e) {
    console.log(index) // 这里知道要处理哪个集合点
    this.setData({
      index: index,
      showAction: true,
    });
  },

  onLoad: function (options) {
    console.log("onLoad")
    const self = this;
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    self.setData({
      route: prevPage.data.route,
      hasModified: prevPage.data.hasModified,
    })
    self.rebuildClickStopFun()
  },

  rebuildClickStopFun: function () {
    for (var i = 0; i < this.data.route.length; i++) {
      // 这里动态创建给click cell的函数
      let index = i; // 还必须用let才行
      this["clickStop" + index] = (e) => {
        this.clickStop(index, e)
      }
    }
  },

  onUnload: function () {
    console.log("onUnload")
    // 这里把数据写回去
    const self = this;
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    prevPage.setData({
      route: self.data.route,
      hasModified: self.data.hasModified,
      "modifys.route": self.data.hasModified,
    })
  },

  // 调出新页面，增加途经点
  addStop: function () {
    wx.navigateTo({
      url: "EditOneStop?action=addLast",
    })
  },

})