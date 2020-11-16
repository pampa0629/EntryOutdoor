const app = getApp()
const util = require('../../utils/util.js')
const cloudfun = require('../../utils/cloudfun.js')
const person = require('../../utils/person.js')

const db = wx.cloud.database({})
const dbPersons = db.collection('Persons')
const dbOutdoors = db.collection('Outdoors')
const _ = db.command

Page({

  data: {
    size: app.globalData.setting.size, // 界面大小
    
    career: {
      evaluation: { level:0}, // career.evaluation.level
      step: {
        autoUpdate: true,
        topLast7:0,
        topLast30:0,
      }, // 步数，是否自动更新
      statistics: {}, // 统计
      topn: [{}, {}, {}],
      other: "",
    },

    StatisticsModes: [{
      mode: "byTime",
      disc: "按最近时间段",
    }, {
      mode: "byYear",
      disc: "按年度",
    }],
  },

  onShareAppMessage: function() {
    const self = this;
    return {
      title: app.globalData.userInfo.nickName + "的户外履历",
      desc: '嘚瑟一下',
      path: 'pages/MyInfo/LookCareer?personid=' + app.globalData.personid
    }
  },

  onShow() {
    this.setData({
      size: app.globalData.setting.size
    })
  },

  onLoad: function(options) {
    const self = this
    // 读取数据库
    if (app.checkLogin()) {
      dbPersons.doc(app.globalData.personid).get().then(res => {
        if (res.data.career) {
          self.setData({
            career: res.data.career
          })
        }
        if (!self.data.career.topn) {
          self.setData({
            "career.topn": [{}, {}, {}]
          })
        }
      })
    }
    wx.showShareMenu({
      withShareTicket: true
    })
  },

  onUnload: function() {
    const self = this
    if (app.globalData.personid) {
      dbPersons.doc(app.globalData.personid).update({
        data: {
          career: self.data.career
        }
      })
    }
  },

  async clickFetchWalk() {
    console.log("MyCareer.clickFetchWalk()")
    if (app.checkLogin()) {
      let step = await person.updateWalkStep(app.globalData.personid, false)
      console.log("step:", step)
      if(step) {
        step.autoUpdate = this.data.career.step.autoUpdate
        this.setData({
          "career.step": step,
        })
      }
    }
  },

  changeAutoUpdate(e) {
    console.log(e)
    this.setData({
      "career.step.autoUpdate": e.detail,
    })
    console.log(this.data.career.step.autoUpdate)
  },

  /////////// 活动统计 ////////////////////////////////////////////////////
  changeStatMode(e) {
    console.log(e)
    const self = this
    self.setData({
      "career.statistics.mode": e.detail,
      showOptions: true,
    })
    if (self.data.career.statistics.mode == "byTime") {
      self.setData({
        StatisticsOptions: ["三个月", "半年", "一年"],
      })
    } else if (self.data.career.statistics.mode == "byYear") {
      self.setData({
        StatisticsOptions: ["2018", "2019"],
      })
    }
  },

  closePopup(e) {
    console.log(e)
    this.setData({
      showOptions: false,
    })
  },

  cancelOptions(e) {
    console.log(e)
    this.setData({
      showOptions: false,
    })
  },

  confirmOptions(e) {
    console.log(e)
    this.setData({
      "career.statistics.option": e.detail.value,
      showOptions: false,
    })
  },

  getStatDateRange() {
    const self = this
    const s = self.data.career.statistics
    var today = new Date()
    var range = {
      begin: new Date(),
      end: new Date()
    }

    if (s.mode == "byTime") {
      // 大于等于 之前的时间， 小于今天
      var dMonth = 0
      if (s.option == "三个月") {
        dMonth = 3
      } else if (s.option == "半年") {
        dMonth = 6
      } else if (s.option == "一年") {
        dMonth = 12
      }
      range.begin.setMonth(today.getMonth() - dMonth);
      range.end = today
    } else if (s.mode == "byYear") {
      // 大于等于这一年的第一天， 小于等于这一年的最后一天
      console.log(s.option)
      range.begin = new Date(s.option, 0, 1, 0, 0, 0, 0)
      range.end = new Date(s.option, 0, 1, 0, 0, 0, 0)
      range.end.setFullYear(range.end.getFullYear() + 1)
      if (range.end > today) { // 最大到今天
        range.end = today
      }
      console.log(range)
    }
    return range
  },

  // 得到统计结果
  queryTables(range, callback) {
    const self = this
    const s = self.data.career.statistics
    s.result = {
      count: {
        total: 0,
        leader: 0,
        loaded: 0
      },
      level: {
        total: 0,
        average: 0,
        max: {
          value: 0,
          id: "",
          title: ""
        }
      },
      added: {
        up: 0,
        length: 0
      },
      star: 0
    }
    // 先看 我参与的活动和 我发起的活动，
    var outdoors = []
    var num = 0
    dbPersons.doc(app.globalData.personid).get().then(res => {
      outdoors = outdoors.concat(res.data.myOutdoors)
      outdoors = outdoors.concat(res.data.entriedOutdoors)
      console.log(outdoors)
      outdoors.forEach((item, index) => {
        // 进入每个活动中，进行详细统计 
        dbOutdoors.doc(item.id).field({
          title:true, 
          status:true,
          limits:true, 
          members:true,
        }).get()
          .then(res => {
            // console.log(res)
            var theDate = new Date(res.data.title.date)
            if ((theDate >= range.begin && theDate <= range.end) // 去掉时间范围不对的 
              &&
              (res.data.status != "拟定中" && res.data.status != "已取消")) { // 去掉活动状态为拟定中或已取消的
              var isTest = false
              if (res.data.limits && res.data.limits.isTest) {
                isTest = true
              }
              if (!isTest) { // 去掉活动为测试类的
                console.log("into one outdoor")
                console.log(res.data.title)
                s.result.count.total++
                  if (res.data.members[0].personid == app.globalData.personid) {
                    s.result.count.leader++
                  }
                if (res.data.title.loaded == "重装") {
                  s.result.count.loaded++
                }
                var level = parseFloat(res.data.title.level)
                s.result.level.total += level
                if (level > s.result.level.max.value) {
                  s.result.level.max.value = res.data.title.level
                  s.result.level.max.id = item.id
                  s.result.level.max.title = res.data.title.whole
                }
                s.result.added.up += res.data.title.addedUp
                s.result.added.length += res.data.title.addedLength
              }
            }
            num++
            if (num == outdoors.length && callback) {
              callback(s.result)
            }
          })
          .catch(err => {
            // console.log(err)
            num++
            if (num == outdoors.length && callback) {
              callback(s.result)
            }
          })
      })
    })
  },

  clickStatistics() {
    console.log("clickStatistics")
    const self = this
    if (app.checkLogin()) {

      // 先把要统计的时间段搞清楚
      var range = self.getStatDateRange()
      console.log(range)

      self.queryTables(range, res => {
        console.log(res)
        // 计算平均强度
        res.level.average = res.level.total / res.count.total
        // 计算多少天一次活动，计算star
        var days = (Math.abs(range.end - range.begin)) / 1000 / 60 / 60 / 24
        var daysPerCount = days / res.count.total
        if (daysPerCount < 10) {
          res.star = 5
        } else if (daysPerCount < 20) {
          res.star = 4
        } else if (daysPerCount < 30) {
          res.star = 3
        } else if (daysPerCount < 60) {
          res.star = 2
        } else if (res.count.total > 0) {
          res.star = 1
        }
        // 构造展示字符串
        res.disc = self.buildStatDisc(res, range)
        console.log(res.disc)
        self.setData({
          "career.statistics.result": res,
        })
      })
    }
  },

  // 记录项目： 共参加活动xx次，其中当领队次数为xx次，重装扎营活动xx次
  // 平均强度为：xx，最大强度是哪一次活动，强度值是：xx
  // 累计爬升：xxxx米，等于几个珠峰？ 累计距离：xxxx公里，几个地球半径？
  // 等于几个星？平均10天一次：五星；20天，四星；30天，三星；60天，两星；一次，一星；
  buildStatDisc(res, range) {
    const self = this
    const NL = "\r\n"
    var disc = ""
    // 昵称，时间段
    disc += app.globalData.userInfo.nickName + "在" + util.formatDate(range.begin) + "到" + util.formatDate(range.end) + "期间" + NL
    // 活动次数
    disc += "共参加活动：" + res.count.total + "次"
    if (res.count.leader > 0) {
      disc += "，其中领队" + res.count.leader + "次"
    }
    if (res.count.loaded > 0) {
      disc += "，重装扎营" + res.count.loaded + "次"
    }
    disc += NL
    // 平均强度和最大强度
    disc += "平均强度为：" + (res.level.average).toFixed(1) + NL
    disc += "强度最大的活动为：" + res.level.max.title + NL
    // 累计爬升和距离
    disc += "累计爬升：" + res.added.up + "00米，相当于登顶珠峰" + (res.added.up / 88.44).toFixed(1) + "次" + NL
    disc += "累计距离：" + res.added.length + "公里，相当于绕北京二环走了" + (res.added.length / 32.7).toFixed(1) + "圈" + NL
    // 综合评分
    disc += "综合评分：" + res.star + "颗星！"
    return disc
  },

  clickCopyResult() {
    const self = this
    wx.setClipboardData({
      data: self.data.career.statistics.result.disc,
    })
  },

  ///////////////////// 其他地方参加的活动 /////////////////////
  inOther() {
    const self = this
    wx.getClipboardData({
      success: function(res) {
        console.log(res.data)
        self.setData({
          "career.other": res.data,
        })
      }
    })
  },

  outOther() {
    const self = this
    wx.setClipboardData({
      data: self.data.career.other,
    })
  },

})