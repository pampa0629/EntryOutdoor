Page({

  data: {
    top:{},
    index:-1,
  },

  onLoad: function (options) {
    console.log(options)
    const self = this;
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    self.setData({
      index: parseInt(options.n),
      top: prevPage.data.career.topn[options.n],
    })
  },

  onUnload: function () {
    const self = this;
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    let n = self.data.index
    prevPage.setData({
      ["career.topn["+n+"]"]: self.data.top,
    })
  },

  changeTitle(e){
    console.log(e)
    const self = this;
    self.setData({
      "top.title":e.detail
    })
  },

  changeResult(e){
    console.log(e)
    const self = this;
    self.setData({
      "top.result": e.detail
    })
  },

  changeDisc(e) {
    console.log(e)
    const self = this;
    self.setData({
      "top.disc": e.detail
    })
  },

})