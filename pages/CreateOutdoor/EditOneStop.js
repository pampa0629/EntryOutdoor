Page({

  data: {
    RouteDates: ["当天", "第二天", "第三天", "第四天", "第五天", "第六天", "第七天", "第八天", "第九天", "第十天"],
    routeDateIndex: 0, // 默认也是当天

    stop: {
      place: "",
      date: "当天",
      time: "",
    },
    index: -1,
    hasModified:false,

    action: null, // 发起这个页面的行为
  },

  onLoad: function (options) {
    console.log(options)
    const self = this
    if (options.index) {
      self.setData({
        index: options.index
      })
    }

    if (options.action) {
      self.data.action = options.action
      if (self.data.action == "edit") {
        // 编辑，则先把原来的加载进来
        let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
        let prevPage = pages[pages.length - 2];
        self.setData({
          stop: prevPage.data.route[options.index]
        })
      }
    }
  },

  // 记录输入地点
  inputStopPlace: function (e) {
    console.log(e)
    this.setData({
      "stop.place": e.detail,
      hasModified: true,
    })
  },

  // 记录输入日期
  changStopDate: function (e) {
    console.log(e)
    const self = this;
    self.setData({
      "stop.date": self.data.RouteDates[e.detail.value],
      hasModified: true,
    })
  },

  // 记录输入路线点的达到预计时间
  changStopTime: function (e) {
    console.log(e)
    this.setData({
      "stop.time": e.detail.value,
      hasModified: true,
    })
  },

  clickSaveAndBack: function () {
    const self = this
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    console.log(self.data.action)
    if (self.data.action == "edit") {
      prevPage.setData({
        ['route[' + self.data.index + ']']: self.data.stop,
        hasModified: self.data.hasModified,
      })
    } else {
      if (self.data.action == "addLast") {
        // 往最后追加一个途经点
        prevPage.data.route.push(self.data.stop)
      } else if (self.data.action == "addBefore") {
        prevPage.data.route.splice(self.data.index, 0, self.data.stop)
      } else if (self.data.action == "addAfter") {
        prevPage.data.route.splice(self.data.index + 1, 0, self.data.stop)
      }
      prevPage.setData({
        route: prevPage.data.route,
        hasModified: true,
      })
      prevPage.rebuildClickStopFun()
    }
    wx.navigateBack({})
  },

})