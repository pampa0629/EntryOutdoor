import Page from 'page';
const app = getApp()

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

  getFormid(e) {
    console.log(e.detail.formId);
    
    this.data.formIds.push(e.detail.formId)
  },

  clearIDs(){
    this.data.formIds = []
  },

  sendMessage: function(e) {
    const self = this
    console.log(e);

    var temps = ["IL3BSL-coDIGoIcLwxj6OzWm47wa1tg13XzvBwDHC_M", "4f4JAb6IwzCW3iElLANR0DASIaccydhxSPCdTRuhfKY","6yT3OTFpgiVohiqSOly-e744802MYBnnOuCwJgYaxWA"]

    wx.cloud.callFunction({
      name: 'getAccessToken', // 云函数名称
    }).then(res => {
      console.log(res.result);
      console.log(self.data.formIds.length);
      for (var i = 0; i < self.data.formIds.length; i++){
        //console.log(res.result);
        var access_token = JSON.parse(res.result).access_token
        console.log(access_token)
        console.log("wx.request")
        wx.request({
          url: 'https://api.weixin.qq.com/cgi-bin/message/wxopen/template/send?access_token=' + access_token,
          method: "POST",
          data: {
            // ogNmG5P3ZlT29kXGhWfGX5nC_sqA ogNmG5KFPConlOTeQNYciQrW5SE4
            // touser: app.globalData.openid,//openId
            touser: "ogNmG5KFPConlOTeQNYciQrW5SE4",
            template_id: temps[i],
            page: 'pages/EntryOutdoor/EntryOutdoor', // ?outdoorid=' + self.data.outdoorid
            // form_id: "1542894664612", // e.detail.formId,//formID
            form_id: self.data.formIds[i],
            data: { //下面的keyword*是设置的模板消息的关键词变量  
              "keyword1": {
                "value": "大觉寺三峰" + app.globalData.userInfo.nickName + "队"
              },
              "keyword2": {
                "value": app.globalData.userInfo.nickName
              },
              "keyword3": {
                "value": app.globalData.userInfo.gender
              },
            },
          },
          header: {
            'content-type': 'application/json' // 默认值
          },
          complete(res) {
            console.log("res.data: ")
            console.log(res.data)
          }
        })
      }
    })

  },


});