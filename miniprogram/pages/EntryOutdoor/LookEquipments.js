const util = require('../../utils/util.js')
const odtools = require('../../utils/odtools.js')
const select = require('../../libs/select.js')

Page({

  data: {
    equipments: {
      mustRes: [],
      canRes: [], 
      noRes: [],
      must: [],
      can: [],
      no: [],
      area:"", 
    },
    leaderDo: true, // 领队是否推荐了
    isOutDate: false, // 活动是否过期
    date: null, // 活动日期
    day: null, // 活动是周几

    weather:null, // 天气预报结果
    weatherText: "", // 天气预报描述

    areaList: null, // 地区列表
    showPopup: false, // 是否显示弹窗
  },

  onLoad: function(options) {
    const self = this;
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    let od = prevPage.data.od

    self.setData({
      loaded: od.title.loaded,
      date: od.title.date,
      day: util.getDay(od.title.date),
      areaList: select.area, // 系统默认
    })

    var hasEquipments = od.limits && od.limits.equipments && (od.limits.equipments.must.length || od.limits.equipments.can.length ||od.limits.equipments.no.length)
    if (hasEquipments) { // 有就直接读取
      self.setData({
        equipments: od.limits.equipments,
        leaderDo: true,
      })
    }

    // 处理过期活动
    if ((new Date()) > new Date(self.data.date)) { // 过期活动，不能用天气预报，也就无法推荐装备了
      self.setData({
        isOutDate: true,
        weatherText: "活动过期，无法获取天气预报，系统也无法推荐装备",
      })
    } else if (self.data.equipments && self.data.equipments.area){
      this.loadEquipments(self.data.equipments.area, self.data.date, !hasEquipments)
    }
  },

  loadEquipments(area, date, isLoadEquipments) {
    const self = this
    odtools.getWeather(area, date, weather => {
      if (weather.result) {
        self.setData({
          weather: weather.weather,
          weatherText: odtools.buildWeatherMessage(weather.weather),
        })
        if (isLoadEquipments){
          var area = self.data.equipments.area
          odtools.loadEquipments(self.data.loaded, self.data.date, weather.weather, equipments => {
            self.setData({
              equipments: equipments,
              "equipments.area": area,
              leaderDo: false,
            })
          })
        }
      } else {
        self.setData({
          weatherText: weather.msg,
        })
      }
    })
  },

  onPopup() {
    console.log("onPopup")
    this.setData({
      showPopup: true,
    })
  },

  closePopup() {
    console.log("closePopup")
    this.setData({
      showPopup: false,
    })
  },

  confirmArea(e) {
    console.log("confirmArea")
    console.log(e)
    var area = ""
    e.detail.values.forEach((item, index) => {
      if (index != 0) { // 省份就不要了
        area += item.name
      }
    })
    this.setData({
      "equipments.area": area,
      showPopup: false,
    })
    this.loadEquipments(this.data.equipments.area, this.data.date, true)
  },

  cancelArea() {
    console.log("cancelArea")
    this.setData({
      showPopup: false,
    })
  },

})