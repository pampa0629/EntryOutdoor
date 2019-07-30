const app = getApp()
const util = require('../../utils/util.js')
const odtools = require('../../utils/odtools.js')
const outdoor = require('../../utils/outdoor.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
const dbPersons = db.collection('Persons')
const _ = db.command
  
Page({  
 
  data: {    
    od:null, 
    meetMembers: [], // 按照集合地点分组的队员名单
    isLeader: false, // 是否是领队：领队能看到队员的电话，非领队看不到；领队按照集合地点排列名单，队员不需要
  },
 
  onLoad: function(options) {
    const self = this;
    if (options.isLeader == "true") {
      self.setData({
        isLeader: true,
      })
    }
    console.log("PrintOutdoor.js in onLoad fun, isLeader is:" + self.data.isLeader)
   
    this.data.od = new outdoor.OD()
    this.data.od.load(options.outdoorid, od => {
      console.log("od:",od)
      
      var myself = util.findValue(od.members, "personid", app.globalData.personid)
      if (myself && myself.entryInfo.status == "领队组") {
        self.setData({ // 领队组也算领队
          isLeader: true,
        })
      }

      // 处理兼容性
      self.dealCompatibility()

      // 把队员按照集合地点进行排列
      self.groupMembersByMeets()
      self.dealChecked()

      // 不是领队，隐藏电话号码中间三位
      console.log(self.data.isLeader)
      if (!self.data.isLeader) {
        self.hidePhone()
      }

      // 设置活动信息
      self.setData({
        od: self.data.od,
      })
    })
  },

  // 处理兼容性
  dealCompatibility: function() {
    const self = this;
    self.data.od.members.forEach((item, index) => {
      // 处理免责条款，把true转化为文字
      if (item.entryInfo.agreedDisclaimer) {
        item.entryInfo.agreedDisclaimer = "已同意免责条款"
      }
      // 转化是否认路 
      if (item.entryInfo.knowWay == true || item.entryInfo.knowWay == undefined) {
        item.entryInfo.knowWay = "认路" // undefined 为没有设置，一般为领队，默认认路
      } else { 
        item.entryInfo.knowWay = "不认路"
      }
      // 设置回去
      self.setData({
        ['od.members[' + index + '].entryInfo']: item.entryInfo,
      })
    })
  }, 

  // 把队员按照集合地点进行排列
  groupMembersByMeets: function() {
    console.log("groupMembersByMeets")
    const self = this;
    if (self.data.od.meets.length >= 1) {
      self.data.meetMembers = new Array(self.data.od.meets.length);
      for (var i = 0; i < self.data.od.meets.length; i++) {
        self.data.meetMembers[i] = new Array();
        // 这里动态创建给check box调用的函数
        let index = i; // 还必须用let才行
        this["cbCallNamebyMeet" + index] = (e) => {
          self.cbCallNamebyMeet(index, e)
        }
      }

      // 遍历所有队员
      for (var j = 0; j < self.data.od.members.length; j++) {
        self.data.meetMembers[self.data.od.members[j].entryInfo.meetsIndex].push(self.data.od.members[j])
      }

      for (var i = 0; i < self.data.od.meets.length; i++){
        for (var j = 0; j < self.data.meetMembers[i].length; j++){
          let index = i // 还必须用let才行
          let cellIndex = j
          this["longTapMeetMembers" + index+"_" + cellIndex] = (e) => {
            self.longTapMeetMembers(index, cellIndex, e)
          }
        }
      }
      self.setData({
        meetMembers: self.data.meetMembers,
      })
    }
  },

  isLeaderGroup(status) {
    if(status == "领队" || status == "领队组") {
      return true
    }
    return false 
  },

  // 隐藏电话号码中间三位
  hidePhone: function() {
    console.log("hidePhone")
    const self = this;
    // 遍历所有队员
    for (var i = 0; i < self.data.meetMembers.length; i++) {
      for(var j=0; j<self.data.meetMembers[i].length; j++) {
        // 当队员不是领队（含领队组），则需要隐藏电话号码的中间四位；领队的电话号码不隐藏
        const member = self.data.meetMembers[i][j]
        if (!self.isLeaderGroup(member.entryInfo.status)) { 
          var phone = member.userInfo.phone.toString();
          member.userInfo.phone = util.hidePhone(phone)
        }
      }
    }
    self.setData({
      meetMembers: self.data.meetMembers,
    })
  },

  dealChecked: function() {
    //if (this.data.isLeader) {//非领队也让具备点名保存功能
      var checks = this.getChecksFromStorage(this.data.od.outdoorid)
      console.log("PrintOutdoor.js in onShow fun, checked is:" + JSON.stringify(checks, null, 2))
      for (var i = 0; i < this.data.meetMembers.length; i++) {
        for (var j = 0; j < this.data.meetMembers[i].length; j++) {
          checks.forEach((item, index) => {
            if (item == this.data.meetMembers[i][j].personid) {
              this.data.meetMembers[i][j].checked = true;
              console.log(this.data.meetMembers[i][j])
            }
          })
        }
      }
      
      this.setData({
        meetMembers: this.data.meetMembers,
      })
    //}
    console.log(this.data.meetMembers)
  },

  getChecksFromStorage: function(outdoorid) {
    var checks = wx.getStorageSync(outdoorid)
    if (!checks) {
      checks = []
    }
    return checks
  },

  // 点名功能
  cbCallName: function(e) {
    console.log("PrintOutdoor.js in cbCallName fun, checked is:" + JSON.stringify(e.detail.value, null, 2))
    // 存本地缓存吧
    wx.setStorageSync(this.data.od.outdoorid, e.detail.value)
  },

  cbCallNamebyMeet: function(index, e) {
    console.log("PrintOutdoor.js in cbCallNamebyMeet fun, index is: " + index + ", checked is:" + JSON.stringify(e.detail.value, null, 2))
 
    // 存本地缓存吧 
    var checks = this.getChecksFromStorage(this.data.od.outdoorid)
    if (e.detail.value.length > 0) { // 全选
      this.data.meetMembers[index].forEach((item, i) => {
        this.setData({
          ['meetMembers[' + index + '][' + i + '].checked']: true
        })
        checks.push(item.personid)
      })
    } else { // 全不选
      this.data.meetMembers[index].forEach((item, i) => {
        this.setData({
          ['meetMembers[' + index + '][' + i + '].checked']: false
        })
        checks.forEach((cItem, cIndex) => {
          if (cItem == item.personid) {
            checks.splice(cIndex, 1)
          }
        })
      })
    }

    wx.setStorageSync(this.data.od.outdoorid, checks)
  },

  longTapMeetMembers(index, cellIndex, e){
    const self = this
    util.phoneCall(self.data.meetMembers[index][cellIndex].userInfo.phone, false)
  },

  longTapMembers(index, e){
    const self = this
    util.phoneCall(self.data.od.members[index].userInfo.phone, false)
  },
 

})