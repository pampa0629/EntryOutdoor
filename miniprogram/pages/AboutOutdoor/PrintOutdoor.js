const app = getApp()
const util = require('../../utils/util.js')
const odtools = require('../../utils/odtools.js')

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
    route: {}, // 活动路线
    meets: [], //集合点，可多个
    meetMembers: [], // 按照集合地点分组的队员名单
    addMembers:[], // 附加队员名单
    isLeader: false, // 是否是领队：领队能看到队员的电话，非领队看不到；领队按照集合地点排列名单，队员不需要
    status: null, // 活动状态
    interphone:"", // 手台频率
  },
 
  onLoad: function(options) {
    const self = this;
    self.setData({
      outdoorid: options.outdoorid,
    })
    if (options.isLeader && options.isLeader == "true") {
      self.setData({
        isLeader: true,
      })
    }
    console.log("PrintOutdoor.js in onLoad fun, isLeader is:" + self.data.isLeader)
    dbOutdoors.doc(self.data.outdoorid).get()
      .then(res => {
        self.setData({
          title: res.data.title,
          members: res.data.members,
          // route: res.data.route, 要做兼容性处理
          meets: res.data.meets,
          status: res.data.status,
        })
        self.dealCompatibility(res)
        console.log(self.data)

        // 把队员按照集合地点进行排列
        self.groupMembersByMeets()
        self.dealChecked()

        // 不是领队，隐藏电话号码中间三位
        console.log(self.data.isLeader)
        if (!self.data.isLeader) { 
          self.hidePhone()
        }
      })
  },

  // 处理兼容性
  dealCompatibility: function(res) {
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
      // 设置回去
      self.setData({
        ['members[' + index + '].entryInfo']: item.entryInfo,
      })
    })
    
    // 活动路线，增加轨迹文件
    if (res.data.route instanceof Array) { // 说明是老格式
      self.setData({
        "route.wayPoints": res.data.route, // 途经点
        "route.trackFiles": [], // 轨迹文件
      })
    } else { // 新格式直接设置
      self.setData({
        route: res.data.route,
      })
    }

    // 附加队员
    if (res.data.addMembers) {
      self.setData({
        addMembers: res.data.addMembers,
      })
    }

    // 手台频率
    if (res.data.route && res.data.route.interphone) {
      self.setData({
        interphone: res.data.route.interphone,
      })
    }

    // 交通方式
    if (res.data.traffic) {
      self.setData({
        traffic: res.data.traffic,
        "traffic.carInfo": odtools.buildCarInfo(res.data.traffic),
        "traffic.costInfo": odtools.buildCostInfo(res.data.traffic),
      })
    }
    
    // next
  }, 

  // 把队员按照集合地点进行排列
  groupMembersByMeets: function() {
    console.log("groupMembersByMeets")
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

      for(var i=0; i<self.data.meets.length; i++){
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

  longTapMeetMembers(index, cellIndex, e){
    const self = this
    util.phoneCall(self.data.meetMembers[index][cellIndex].userInfo.phone, false)
  },

  longTapMembers(index, e){
    const self = this
    util.phoneCall(self.data.members[index].userInfo.phone, false)
  },
 

})