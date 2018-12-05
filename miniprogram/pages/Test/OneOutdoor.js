import Page from 'page';
const app = getApp()

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
const dbPersons = db.collection('Persons')


Page({
  data: {
    home: false,
    formIds: [],
  },

  onLoad() {

  },

  onContact: function(e) {
    console.log(JSON.stringify(e, null, 2))
    wx.showModal({
      title: '客服消息',
      content: JSON.stringify(e, null, 2),
    })
  },

  onTest: function(e) {

    console.log(e.detail.errMsg)
    console.log(e.detail.iv)
    console.log(e.detail.encryptedData)
  },

  likeO() {
    console.log("likeO")

  },

  home() {
    const self = this
    console.log("home")
    this.setData({
      home: !self.data.home,
    })
  },

  dbKey(){
    var key = "1234"
    dbPersons.doc(app.globalData.personid).update({
      data:{
        ["subscribe."+key]:{accept:true}
      }
    })
  },

  dbRead(){
    var key = "1234"
    dbPersons.doc(app.globalData.personid).get().then(res=>{
      var accept = res.data.subscribe[key]
      console.log(accept)
    })
  }


});