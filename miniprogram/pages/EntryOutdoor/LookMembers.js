// pages/EntryOutdoor/LookMembers.js
Page({

  data: {
    members:null,
    addMembers:null,
  },

  onLoad: function (options) {  
    console.log("onLoad")
    const self = this;
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    self.setData({
      members: prevPage.data.od.members,
      addMembers: prevPage.data.od.addMembers,
    })
    
    // 把认路与否的转化为文本
    self.data.members.forEach((item, index)=>{
      console.log(JSON.stringify(item))
      if (item.entryInfo.knowWay ==undefined || item.entryInfo.knowWay == true){
        item.entryInfo.knowWay = "认路" // undefined 为没有设置，一般为领队，默认认路
      } else {
        item.entryInfo.knowWay = "不认路"
      }
    })
    self.setData({
      members: self.data.members,
    })
  },

})