const app = getApp()
const util = require('../../utils/util.js')
wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
const dbPersons = db.collection('Persons')
const _ = db.command

Page({

  data: {   
    outdoorid: null, // 活动id
    title: {}, // 活动主题信息，内容从数据库中读取
    members: null, // 队员报名信息，包括:基本信息（userInfo)内容从Persons数据库中读取; 报名信息（entryInfo），报名时填写
    route: [], // 活动路线，由多个站点（stop）组成
    meets: [], //集合点，可多个
    meetMembers: [], // 按照集合地点分组的队员名单
    isLeader: false, // 是否是领队：领队能看到队员的电话，非领队看不到；领队按照集合地点排列名单，队员不需要
    status: null, // 活动状态
  },

  onLoad: function(options) {
    console.log("PrintOutdoor.js in onLoad fun, options is:" + JSON.stringify(options, null, 2))
    const self = this;
    if (options != null && options.outdoorid != null && options.isLeader != null) {
      if (options.isLeader == "true") {
        self.data.isLeader = true;
      }
      self.setData({
        outdoorid: options.outdoorid,
        isLeader: self.data.isLeader,
      })
    } else { // 参数不对，就直接返回吧
      return
    }
 
    console.log("PrintOutdoor.js in onLoad fun, isLeader is:" + self.data.isLeader)
    dbOutdoors.doc(self.data.outdoorid).get()
      .then(res => {
        self.setData({
          title: res.data.title,
          members: res.data.members,
          route: res.data.route,
          meets: res.data.meets,
          status: res.data.status,
        })
        self.dealCompatibility()
        console.log(self.data)

        if (self.data.isLeader) { // 是领队：分组，缓存checked
          // 把队员按照集合地点进行排列
          self.groupMembersByMeets()
          self.dealChecked()
        } else { // 不是领队，隐藏电话号码中间三位
          self.hidePhone()
        }
      })
  },

  // 处理兼容性
  dealCompatibility: function() {
    const self = this;
    self.data.members.forEach((item, index) => {
      // 处理免责条款，把true转化为文字
      if (item.entryInfo.agreedDisclaimer) {
        item.entryInfo.agreedDisclaimer = "已同意免责条款"
      }
      // 转化是否认路
      if (item.entryInfo.knowWay || index == 0) { // 第一个是领队，必须认路
        item.entryInfo.knowWay = "认路"
      } else {
        item.entryInfo.knowWay = "不认路"
      }

      // next 
    
      // 设置回去
      self.setData({
        ['members[' + index + '].entryInfo']: item.entryInfo,
      })
    })
  }, 

  // 把队员按照集合地点进行排列
  groupMembersByMeets: function() {
    const self = this;
    if (self.data.meets.length >= 1) {
      self.data.meetMembers = new Array(self.data.meets.length);
      for (var i = 0; i < self.data.meets.length; i++) {
        self.data.meetMembers[i] = new Array();
        // 这里动态创建给check box调用的函数
        let index = i; // 还必须用let才行
        this["cbCallNamebyMeet" + index] = (e) => {
          self.cbCallNamebyMeet(index, e)
        }
      }

      // 遍历所有队员
      for (var j = 0; j < self.data.members.length; j++) {
        self.data.meetMembers[self.data.members[j].entryInfo.meetsIndex].push(self.data.members[j])
      }
      self.setData({
        meetMembers: self.data.meetMembers,
      })
    }
  },

  // 不是领队，隐藏电话号码中间三位
  hidePhone: function() {
    const self = this;
    // 遍历所有队员
    for (var j = 1; j < self.data.members.length; j++) {
      // 当前用户不是领队，则需要隐藏电话号码的中间四位；领队的电话号码不隐藏
      var phone = self.data.members[j].userInfo.phone.toString();
      phone = phone.substring(0, 3) + "***" + phone.substring(7)
      self.data.members[j].userInfo.phone = phone
    }
    self.setData({
      members: self.data.members,
    })
  },

  dealChecked: function() {
    if (this.data.isLeader) {
      var checks = this.getChecksFromStorage(this.data.outdoorid)
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
    }
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
    wx.setStorageSync(this.data.outdoorid, e.detail.value)
  },

  cbCallNamebyMeet: function(index, e) {
    console.log("PrintOutdoor.js in cbCallNamebyMeet fun, index is: " + index + ", checked is:" + JSON.stringify(e.detail.value, null, 2))

    // 存本地缓存吧
    var checks = this.getChecksFromStorage(this.data.outdoorid)
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

    wx.setStorageSync(this.data.outdoorid, checks)
  },

})