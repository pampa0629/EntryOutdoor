const util = require('../../utils/util.js')
const outdoor = require('../../utils/outdoor.js')

Page({

  data: {
    equipments: {
      mustRes: [],
      canRes: [],
      noRes: [],
      must: [],
      can: [],
      no: [],
    },
    leaderDo: true, // 领队是否推荐了
    isOutDate: false, // 活动是否过期
    weather: "", // 天气预报
  },

  onLoad: function(options) {
    const self = this;
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];

    // 处理过期活动
    if ((new Date()) > new Date(prevPage.data.title.date)) { // 过期活动，不能用天气预报，也就无法推荐装备了
      self.setData({
        isOutDate: true,
        weather: "活动过期，无法获取天气预报，系统也无法推荐装备",
      })
    }

    var hasEquipments = prevPage.data.limits && prevPage.data.limits.equipments
    if (hasEquipments) { // 有就直接读取
      self.setData({
        equipments: prevPage.data.limits.equipments,
        leaderDo: true,
      })
    }

    if (!self.data.isOutDate) {
      outdoor.getWeather(null, prevPage.data.title.date, weather => {
        if (weather) {
          self.setData({
            weather: outdoor.buildWeatherMessage(weather),
          })
        } else {
          self.setData({
            weather: "获取天气预报失败",
          })
        }

        if (!hasEquipments && weather) {
          outdoor.loadEquipments(prevPage.data.title.loaded, prevPage.data.title.date, weather, equipments => {
            self.setData({
              equipments: equipments,
              leaderDo: false,
            })
          })
        }
      })
    }
  },

})