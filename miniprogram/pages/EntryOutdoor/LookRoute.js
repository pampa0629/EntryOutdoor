// pages/EntryOutdoor/LookRoute.js
Page({

  data: {
    route: [], // 活动路线，由多个站点（stop）组成
  },

  onLoad: function (options) {
    console.log("onLoad")
    const self = this;
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    self.setData({
      route: prevPage.data.route,
    })
  },
  
})