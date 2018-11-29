// pages/MyInfo/ModifyInfo.js
const app = getApp()
wx.cloud.init()
const db = wx.cloud.database({})
const dbPersons = db.collection('Persons')

Page({
  data: {
    userInfo:{nickName:null,gender:null,phone:null},
    Genders: ["GG", "MM"], // 性别选项; //性别 0:未知、1:男、2:女
    // which:"", // 要修改哪一项
    phoneErrMsg: "", // 电话号码输入错误提示 ==手机号格式错误
    hasModified:false, // 是否修改了
  },

  onLoad: function (options) {
    const self = this;
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    self.setData({
      userInfo: prevPage.data.userInfo,
    })
  },

  changeNickName: function (e) {
    console.log(e)
    const self = this
    self.setData({
      hasModified: true,
      "userInfo.nickName": e.detail
    })
  },

  changePhone: function (e) {
    console.log(e)
    const self = this
    self.setData({
      hasModified: true,
      "userInfo.phone": e.detail.toString(), // 转为字符串
    })
    if(self.data.userInfo.phone.length != 11){
      self.setData({
        phoneErrMsg:"请输入11位手机号码"
      })
    }
  },

  changeGender: function (e) {
    console.log(e)
    const self = this
    self.setData({
      "userInfo.gender": e.detail,
      hasModified: true,
    })
  },

  updatePerson: function () {
    const self = this;
    dbPersons.doc(app.globalData.personid).update({
      data: {
        userInfo: self.data.userInfo
      }
    })
    .then(res => {
      self.setData({
        hasModified: false,
      })
      app.globalData.userInfo = self.data.userInfo
      // 修改“我的信息”页面
      let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
      let prevPage = pages[pages.length - 2];
      prevPage.setData({
          userInfo: self.data.userInfo,
      })
    })
  },

})