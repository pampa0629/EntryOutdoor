// pages/EntryOutdoor/LookDisclaimer.js
Page({

  data: {
    disclaimer: "", //免责条款
  },

  onLoad: function(options) {
    const self = this;
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    console.log(prevPage.data.limits)
    console.log(prevPage.data.limits.disclaimer)
    if (prevPage.data.limits.disclaimer) {
      self.setData({
        disclaimer: prevPage.data.limits.disclaimer,
      })
    }
  },

})