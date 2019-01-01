// pages/All/MyOutdoors.js
const app = getApp()
const util = require('../../utils/util.js')
wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
const dbPersons = db.collection('Persons')

Page({
  data: {
    currentTab: 1, // 默认是我参加的
    myOutdoors: [], // 我创建的活动列表
    entriedOutdoors: [], // 我参加的活动列表
    caredOutdoors: [], // 我关注的活动列表

    screenHeight: 736, // 默认可用屏幕高度
    
    // 弹出功能选项
    index:"", // 即将要处理的
    showAction: false,
    Actions: [{
      name: '设置不可见',
      subname: "该活动将从列表中不可见"
    },    
    ],
  },

  onLoad: function() {
    if (!app.globalData.hasUserInfo) { // 判断是否登录先
      wx.showModal({
        title: '查看“我的活动”需先登录',
        content: '小程序将自动切换到“我的信息”页面，请点击“微信登录”按钮登录',
        showCancel: false,
        confirmText: "知道了",
        complete: function(res) {
          wx.switchTab({
            url: '../MyInfo/MyInfo'
          })
        }
      })
    }
    console.log("MyOutdoors.js in onLoad fun, personid is:" + app.globalData.personid)

    var sysInfo = wx.getSystemInfoSync();
    this.setData({
      screenHeight: (sysInfo.screenHeight - sysInfo.statusBarHeight) * 0.8,
    })
    console.log("MyOutdoors.js in onLoad fun, screenHeight is:" + this.data.screenHeight)
  },

  onShow: function() {
    const self = this;
    dbPersons.doc(app.globalData.personid).get()
      .then(res => { // 从Persons表中取出数据
        self.setData({
          myOutdoors: res.data.myOutdoors,
          entriedOutdoors: res.data.entriedOutdoors,
          caredOutdoors: res.data.caredOutdoors,
        })
      })
  },

  // 隐藏，则需要把列表内容写回去
  save() {
    const self = this;
    dbPersons.doc(app.globalData.personid).update({
      data: {
        myOutdoors: self.data.myOutdoors,
        entriedOutdoors: self.data.entriedOutdoors,
        caredOutdoors: self.data.caredOutdoors,
      },
    })
  },

  //滑动切换
  swiperTab: function(e) {
    var that = this;
    that.setData({
      currentTab: e.detail.current
    });
  },

  //点击切换
  changeTab: function(e) {
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

  tapMyOutdoors: function(e) {
    const self = this;
    self.tapOneOutdoor(e.currentTarget.dataset.pos, "myOutdoors", self.data.myOutdoors);
  },

  // 切换到“活动报名”的页面
  tapEntriedOutdoors: function(e) { 
    const self = this;
    self.tapOneOutdoor(e.currentTarget.dataset.pos, "entriedOutdoors", self.data.entriedOutdoors);
  },

  // 我关注的活动列表
  // 当每次新发起活动，修改活动，或者删除活动后，“我的活动”中的列表也应随之变化
  tapCaredOutdoors: function(e) {
    const self = this;
    self.tapOneOutdoor(e.currentTarget.dataset.pos, "caredOutdoors", self.data.caredOutdoors);
  },

  // 长按，出现“不可见”按钮
  longTap(e){
    const self = this
    console.log(e)
    this.setData({
      index:e.currentTarget.dataset.pos,
      showAction: true,
    });
  },

  onCancelAction() {
    this.setData({
      showAction: false
    });
  },

  onSelectAction(e) {
    console.log(e); // todo e.detail == name 
    const self = this
    let i = self.data.index
    if (e.detail.name == "设置不可见") {
      if (self.data.currentTab == 0) {
        self.setData({
          ['myOutdoors[' + i + '].invisible']: true,
        })
      } else if(self.data.currentTab == 1){
        self.setData({
          ['entriedOutdoors['+i+'].invisible']:true,
        })
      } else if (self.data.currentTab == 2) {
        self.setData({
          ['caredOutdoors[' + i + '].invisible']: true,
        })
      } 
    }
    this.save()
    this.setData({
      showAction: false
    });
  },
 
  // 点击了某个活动之后的处理，统一代码
  tapOneOutdoor: function (index, name, outdoors) {
    // 先看看选中的活动id是否还在（没有被删除）
    const self = this;
    var outdoorid = outdoors[index].id
    console.log("MyOutdoor.js in tapOneOutdoor fun, outdoorid is:" + outdoorid)
    dbOutdoors.doc(outdoorid).get()
      .then(res => {
        util.saveOutdoorID(outdoorid)
        if (name == "myOutdoors") {
          wx.switchTab({ // 我发起的活动，要切换到“发起活动”页面
            url: "../CreateOutdoor/CreateOutdoor"
          })
        } else {
          wx.navigateTo({
            url: "../EntryOutdoor/EntryOutdoor?outdoorid=" + outdoorid
          })
        }
      })
      .catch(err => {
        wx.showModal({
          title: '提示',
          content: '点击的活动找不到了，可能已被删除',
          showCancel: false,
          confirmText: "知道了",
        })
        // 找不到对应的outdoorid，则说明活动已经不存在了，得从Person表中删除对应活动信息
        console.log("MyOutdoors.js in tapOneOutdoor fun, err is:" + JSON.stringify(err, null, 2))

        outdoors.splice(index, 1)
        self.setData({
          [name]: outdoors,
        })
        dbPersons.doc(app.globalData.personid).update({
          data: {
            [name]: outdoors,
          }
        })
      })
  },

})