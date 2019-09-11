wx.cloud.init()
const db = wx.cloud.database({})
const dbPersons = db.collection('Persons')
const _ = db.command
const crypto = require('../../utils/crypto.js')
const cloudfun = require('../../utils/cloudfun.js')

Page({

  data: {
    personid: "",
    nickName: "",
    show: false,
    emergency: {},
    entriedOutdoors: null,
    myOutdoors: null,
    key: "", // 传递过来的password
    showMessage: "",
  },

  async onLoad(options) {
    console.log("onload")
    console.log(options)
    const self = this

    if (options.personid) {
      self.setData({
        personid: options.personid,
      })
      var password = ""
      if (options.password) {
        self.setData({
          key: options.password,
        })
        password = crypto.decrypt(options.password, "wx20edd5723fb67799")
        console.log(password)
      }

      let res = await dbPersons.doc(self.data.personid).get()
      self.setData({
        nickName: res.data.userInfo.nickName,
        emergency: crypto.decrypt(res.data.emergency, password),
        entriedOutdoors: res.data.entriedOutdoors,
        myOutdoors: res.data.myOutdoors,
      })
      console.log(self.data.emergency)
      if (self.data.emergency.entrust.open) {
        var now = new Date()
        let time = cloudfun.getServerDate()
        now.setTime(time)
        console.log(now.toLocaleDateString())
        var start = new Date(self.data.emergency.entrust.start)
        var end = new Date(self.data.emergency.entrust.end)
        if ((now >= start && now <= end) || now.toLocaleDateString() == start.toLocaleDateString() || now.toLocaleDateString() == end.toLocaleDateString()) {
          self.setData({
            show: true,
          })
        }
      }

      if(!self.data.show) {
        var message = self.data.nickName + "没有开启委托，或者不在可委托日期范围内。若确定有危险需要紧急联络，请报警并联系QQ：50463253，告知如下信息：1）数据库ID：" + self.data.personid + "；2）密钥：" + self.data.key
        self.setData({
          show: false,
          showMessage: message,
        })
        console.log(self.data.showMessage)
      }
    }
  },

  clickCopy() {
    const self = this
    wx.setClipboardData({
      data: self.data.showMessage,
    })
  },

  tapEntriedOutdoors(e){
    const self = this;
    var outdoorid = self.data.entriedOutdoors[e.currentTarget.dataset.pos].id
    self.lookOneOutdoor(outdoorid);
  },

  tapMyOutdoors(e){
    const self = this;
    var outdoorid = self.data.myOutdoors[e.currentTarget.dataset.pos].id
    self.lookOneOutdoor(outdoorid);
  },

  lookOneOutdoor(outdoorid){
    const self = this
    wx.navigateTo({
      url: "../AboutOutdoor/PrintOutdoor?outdoorid=" + outdoorid + "&isLeader=false"
    })
  },

})