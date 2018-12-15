// pages/MyInfo/ModifyInfo.js
const app = getApp()
wx.cloud.init()
const db = wx.cloud.database({})
const dbPersons = db.collection('Persons')

Page({
  data: {
    userInfo:{nickName:null,gender:null,phone:null},
    Genders: ["GG", "MM"], // 性别选项; //性别 0:未知、1:男、2:女
    hasModified: false, // 是否修改了
    
    phoneErrMsg: "", // 电话号码输入错误提示 ==手机号格式错误
    nickErrMsg:"", // 昵称必须唯一
    oldNickName:"", // 只有修改了，才进行昵称的唯一性判断
  },

  onLoad: function (options) {
    const self = this;
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    self.setData({
      userInfo: prevPage.data.userInfo,
    })
    self.data.oldNickName = self.data.userInfo.nickName
  },

  changeNickname: function (e) {
    console.log(e)
    const self = this
    self.setData({
      hasModified: true,
      "userInfo.nickName": e.detail,
      nickErrMsg: "",
    })
  },

  // 这里判断昵称的唯一性和不能为空
  blurNickname(e){
    console.log(e)
    const self = this
    if (!self.data.userInfo.nickName){
      self.setData({
        nickErrMsg: "昵称不能为空，已自动恢复旧名",
        "userInfo.nickName": self.data.oldNickName
      })
    }
    else if(self.data.oldNickName != self.data.userInfo.nickName){
      dbPersons.where({
        "userInfo.nickName":self.data.userInfo.nickName
        }).get().then(res=>{
          console.log(res.data)
          if(res.data.length>0){
            self.setData({
              nickErrMsg:"修改后的昵称已被占用不能使用，已自动恢复旧名",
              "userInfo.nickName": self.data.oldNickName
            })
          }
        })
    }
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

  clickGender(e){
    console.log(e)
    this.setData({
      "userInfo.gender": e.target.dataset.name,
      hasModified: true,
    })
  },

  changeGender: function (e) {
    console.log(e)
    const self = this
    self.setData({
      "userInfo.gender": e.detail,
      hasModified: true,
    })
  },

  onUnload() {
    const self = this;
    if(self.data.hasModified) {
      app.globalData.userInfo = self.data.userInfo
      // 修改“我的信息”页面
      let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
      let prevPage = pages[pages.length - 2];
      prevPage.setData({
        userInfo: self.data.userInfo,
      })
      // 写入数据库
      dbPersons.doc(app.globalData.personid).update({
        data: {
          userInfo: self.data.userInfo
        }
      })
    }
  },

})