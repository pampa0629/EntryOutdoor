const app = getApp()
const util = require('../../utils/util.js')
const person = require('../../utils/person.js')
const group = require('../../utils/group.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbPersons = db.collection('Persons')
const dbGroups = db.collection('Groups')

Page({ 

  data: {
    groupid:"", // group 在表中的id
    groupOpenid: "",

    owner:null, 
    isOwner:false, // 是否为群主

    members:[], 
    openids:[],
    personids:[],
    showMembers:false, 

    rank:{},
    currentTab: 0, 
    screenHeight: 736, // 默认可用屏幕高度
    size: app.globalData.setting.size, // 界面大小
  },

  onLoad: function(options) {
    console.log("OneGroup.onLoad()", options)
    wx.showShareMenu({
      withShareTicket: true
    }) 
    
    const self = this
    self.setData({
      groupOpenid: options.groupOpenid
    })
    console.log("group openid: "+self.data.groupOpenid)
    dbGroups.where({
      groupOpenid: self.data.groupOpenid
    }).get().then(res => {
      if(res.data.length > 0) {
        const group = res.data[0]
        console.log(group)
        // id 
        self.data.groupid = group._id

        // 群成员列表
        for (var i in group.members) {
          if (group.members[i].openid != app.globalData.openid) {
            self.data.members.push(group.members[i].userInfo.nickName)
            self.data.openids.push(group.members[i].openid)
          }
          self.data.personids.push(group.members[i].personid) // 这个是统计用，得所有人都要
        }
        self.setData({
          members: self.data.members,
        })

        // 群主 
        if (group.owner) {
          self.setData({
            owner: group.owner,
          })
          if (group.owner.openid == app.globalData.openid) {
            self.setData({
              isOwner: true,
            })
          }
        }

        // 排行榜
        if(group.rank) {
          self.setData({
            rank:group.rank
          })
          self.buildFuntions()
        }
      }
    })

    var sysInfo = wx.getSystemInfoSync();
    this.setData({
      screenHeight: (sysInfo.screenHeight - sysInfo.statusBarHeight) * 0.7,
    })
  },

  onShow() {
    this.setData({
      size: app.globalData.setting.size
    })
  },

  onUnload: function() {

  },

//////////// 转让群主 ///////////////////
  tapChangeOwner() {
    this.setData({
      showMembers: true,
    })
  },

  onCloseMembers() {
    this.setData({
      showMembers: false,
    })
  },

  onCancelMembers() {
    this.setData({
      showMembers: false,
    })
  },

  // 确认转让
  onConfirmMembers(e) {
    console.log(e)
    const self = this
    const openid = self.data.openids[e.detail.index]
    group.changeOwner(self.data.groupid, openid, owner=>{
      console.log(owner)
      self.setData({
        showMembers: false,
        owner: owner,
        isOwner: false,
      })
    })
  },

  /////////////////// 排行榜 /////////////////////////
  async tapRank() {
    console.log("tapRank()")

    const self = this
    const rank = self.data.rank
    wx.showLoading({title: '统计中请稍后',})
    let counts = await self.statPersons()
    console.log(counts)
    // 一共的
    counts.sort((a,b)=>{
      return b.total - a.total
    })
    rank.total = []
    rank.total = rank.total.concat(counts)
    console.log(rank.total)

    // 今年的
    counts.sort((a, b) => {
      return b.thisyear - a.thisyear
    })
    rank.thisyear = []
    rank.thisyear = rank.thisyear.concat(counts)
    console.log(rank.thisyear)

    // 去年的
    counts.sort((a, b) => {
      return b.lastyear - a.lastyear
    })
    rank.lastyear = []
    rank.lastyear = rank.lastyear.concat(counts)
    console.log(rank.lastyear)
    
    // 构造函数
    self.buildFuntions()

    // 最后更新时间
    rank.update = util.formatTime(new Date())

    self.setData({
      rank:rank,
    })
    group.saveRank(self.data.groupid, rank)
    wx.hideLoading()
    // })
  },

  buildFuntions() {
    console.log("buildFuntions")
    const self = this
    const rank = self.data.rank
    console.log(rank)

    for (var i in rank.total) {
      let index = i; // 还必须用let才行
      this["clickTotal" + index] = (e) => {
        self.clickTotal(index, e)
      }
    }

    for (var i in rank.thisyear) {
      let index = i; // 还必须用let才行
      this["clickThisyear" + index] = (e) => {
        self.clickThisyear(index, e)
      }
    }

    for (var i in rank.lastyear) {
      let index = i; // 还必须用let才行
      this["clickLastyear" + index] = (e) => {
        self.clickLastyear(index, e)
      }
    }
  },

  clickTotal(index, e) {
    this.gotoPersonCareer(this.data.rank.total[index].personid)
  },

  clickThisyear(index, e) {
    this.gotoPersonCareer(this.data.rank.thisyear[index].personid)
  },

  clickLastyear(index, e) {
    this.gotoPersonCareer(this.data.rank.lastyear[index].personid)
  },

  gotoPersonCareer(personid) {
    wx.navigateTo({
      url: '../MyInfo/LookCareer?personid='+personid,
    })
  },

  // 统计每个人的活动次数
  async statPersons() {
    console.log("statPersons()")
    const self = this
    var counts = []
    // var num = 0
    for (var id in self.data.personids) {
    // self.data.personids.forEach((item, index) => {
      let personid = self.data.personids[id]
      let res = await dbPersons.doc(personid).get()
      var outdoors = []
      outdoors = outdoors.concat(res.data.myOutdoors)
      outdoors = outdoors.concat(res.data.entriedOutdoors)
      var years = self.countOutdoor(outdoors)
      var one = { nickName: res.data.userInfo.nickName, total: outdoors.length, thisyear: years.thisyear, lastyear: years.lastyear, personid: personid}
      // console.log(one)
      counts.push(one)
      // num ++ 
      // if (num == self.data.personids.length && callback) {
      //   callback(counts)
      // }
    }
    return counts
  },

  countOutdoor(outdoors){
    const self = this
    const thisyear = (new Date()).getFullYear()
    const lastyear = (new Date()).getFullYear()-1
    var years = {thisyear:0, lastyear:0}
    outdoors.forEach((item, index)=>{
      // 先分解 title
      var year = item.title.substr(0, 4)
      if(year == thisyear) {
        years.thisyear ++
      } else if (year == lastyear) {
        years.lastyear ++
      }
    })
    return years
  },

  //滑动切换
  swiperTab: function (e) {
    var that = this;
    that.setData({
      currentTab: e.detail.current
    });
  },

  //点击切换
  changeTab: function (e) {
    //console.log(e)
    var that = this;
    if (this.data.currentTab === e.detail.index) {
      return false;
    } else {
      that.setData({
        currentTab: e.detail.index
      })
    }
  },

  onShareAppMessage: function() {
    const self = this
    return {
      title: "户外群排行榜",
      path: 'pages/AboutGroup/OneGroup?groupOpenid=' + self.data.groupOpenid
    }
  }, 

})