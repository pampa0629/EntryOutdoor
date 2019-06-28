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
      if(item.entryInfo.knowWay){
        item.entryInfo.knowWay = "认路"
      } else {
        item.entryInfo.knowWay = "不认路"
      }
      console.log(item)
    })
    self.setData({
      members: self.data.members,
    })
  },

})