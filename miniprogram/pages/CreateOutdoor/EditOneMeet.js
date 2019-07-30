const app = getApp()
const template = require('../../utils/template.js')
const util = require('../..//utils/util.js')

Page({

  data: {
    MeetDates: ["前三天", "前两天", "前一天", "当天"],
    meetDatesIndex: 3, // 默认是当天集合

    meet: {  
      place: "", // 人输入的位置描述
      date: "当天",  
      time: "", 
      name: "", // 地图上选择的地名描述 
      latitude: null, // 维度
      longitude: null, // 经度
    },
    index: -1,
    hasModified: false,
    od:null,

    action: null, // 发起这个页面的行为
  },

  onLoad: function(options) {
    console.log(options)
    const self = this
    if (options.index) {
      self.setData({
        index: options.index
      })
    }

    if (options.action) {
      self.data.action = options.action
      let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
      let prevPage = pages[pages.length - 2];
      if (self.data.action == "edit") {
        // 编辑，则先把原来的加载进来
        self.setData({
          meet: prevPage.data.meets[options.index],
        })
      }
      self.setData({
        od: pages[pages.length - 3].data.od,
      })
    }
  },

  // 记录输入集合点
  inputMeetPlace: function(e) {
    console.log(e)
    this.setData({
      "meet.place": e.detail,
      hasModified: true,
    })
  },

  pasteMeetPlace: function () {
    const self = this
    wx.getClipboardData({
      success: function (res) {
        console.log(res.data)
        self.setData({
          "meet.place": res.data,
          hasModified: true,
        })
      }
    })
  },

  // 记录输入集合点的日期
  changMeetDate: function(e) {
    console.log(e)
    const self = this;
    self.setData({
      "meet.date": self.data.MeetDates[e.detail.value],
      hasModified: true,
    })
  },

  // 记录输入路线点的达到预计时间
  changMeetTime: function(e) {
    console.log(e)
    this.setData({
      "meet.time": e.detail.value,
      hasModified: true,
    })
  },

  chooseMeetAddress() {
    const self = this
    if (self.data.meet.place) { // 之前有输入，则把输入拷贝到内存中，方便后面地图上搜索
      wx.setClipboardData({　　　　　　
        data: self.data.meet.place,
      })
    }
    var message = "同意授权“使用我的地理位置”才能调用微信地图；小程序不会记录您的位置，请放心"
    util.authorize("userLocation", message, res => {
      wx.chooseLocation({
        success(res) {
          console.log(res)
          self.setData({
            "meet.name": res.name,
            "meet.latitude": res.latitude,
            "meet.longitude": res.longitude,
            hasModified: true,
          })
          if (!self.data.meet.place) {
            self.setData({
              "meet.place": res.name, // 帮着设置一下
            })
          }
        }
      })
    })
  },

  save: function (e) {
    console.log("save()")
    if (e)
      template.savePersonFormid(app.globalData.personid, e.detail.formId, null)
    console.log(this.data.meet)
    if (this.data.hasModified && this.data.meet.place && this.data.meet.date && this.data.meet.time) {
      const self = this
      let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
      let prevPage = pages[pages.length - 2];
      let prevprevPage = pages[pages.length - 3];
      let od = this.data.od
      console.log(self.data.action)
      console.log(self.data.meet)
      if (self.data.action == "edit") {
        prevPage.setData({
          ['meets[' + self.data.index + ']']: self.data.meet,
        })
      } else {
        if (self.data.action == "addLast") {
          // 往最后追加一个集合点
          prevPage.data.meets.push(self.data.meet)
        } else if (self.data.action == "addBefore") {
          prevPage.data.meets.splice(self.data.index, 0, self.data.meet)
        } else if (self.data.action == "addAfter") {
          prevPage.data.meets.splice(self.data.index + 1, 0, self.data.meet)
        }
        prevPage.setData({
          meets: prevPage.data.meets,
        })
        prevPage.rebuildClickMeetFun()
      }
      // 最上面也要记得设置，以便刷新主界面
      console.log("od:",od)
      prevprevPage.setData({
        "od.meets":od.meets
      })
      
      od.saveItem("meets")
      this.setData({
        hasModified: false
      })
    }
  },

  onUnload: function () {
    console.log("onUnload()")
    this.save() // 自动保存
  },

  giveup(e) {
    template.savePersonFormid(app.globalData.personid, e.detail.formId, null)
    this.data.hasModified = false
    wx.navigateBack({})
  },

})