Page({

  data: {
    operations : [],
  }, 

  onLoad: function (options) {
    console.log("LookOutdoorOp.onLoad()", options)

    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 3];
    let od = prevPage.data.od
    this.setData({
      operations: od.operations ? od.operations:[]
    })
  },

})