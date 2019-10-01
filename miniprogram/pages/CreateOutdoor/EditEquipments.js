const app = getApp()

const template = require('../../utils/template.js')
const util = require('../../utils/util.js')
const odtools = require('../../utils/odtools.js')
// const select = require('../../libs/select.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbSelect = db.collection('Selects')
const _ = db.command

Page({

  data: {
    equipments: {
      mustRes: [],
      canRes: [],
      noRes: [],
      must: [],
      can: [],
      no: [],
      area: "北京市", // 选中的地区
    },
    loaded: null, // 负重情况
    weatherText: "", // 天气预报文本
    date: null, // 活动日期
    day: null, // 活动是周几
    hasModified: false,
    od: null, // 活动对象

    areaList: null, // 地区列表
    showPopup: false, // 是否显示弹窗

    dialog: {
      show: false,
      oldName: "", // 原来的装备名称
      newName: "", // 新的装备名称
    }
  },

  async onLoad(options) {
    const self = this
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    let limits = prevPage.data.limits
    this.setData({
      od: pages[pages.length - 3].data.od
    })
    let od = this.data.od

    self.setData({
      loaded: od.title.loaded,
      date: od.title.date,
      day: util.getDay(od.title.date),
      //areaList: select.area, // 系统默认
    })

    let area = await util.loadArea()
    self.setData({
      areaList: area,
    })

    console.log(limits)
    if (limits.equipments && limits.equipments.area) { // 没过期，有活动地区，则查询天气预报
      self.setData({
        "equipments.area": limits.equipments.area,
      })
    }

    console.log(self.data.equipments.area)
    // 处理过期活动
    if (od.expired) { // 过期活动，不能用天气预报，也就无法推荐装备了
      self.setData({
        weatherText: "活动过期，无法获取天气预报，系统也无法推荐装备",
      })
    } else if (self.data.equipments.area) { // 没过期，有活动地区，则查询天气预报
      await odtools.getWeather(self.data.equipments.area, self.data.date, weather => {
        console.log("weather:", weather)
        if (weather.result) {
          self.setData({
            weather: weather.weather,
            weatherText: odtools.buildWeatherMessage(weather.weather),
          })
        } else {
          self.setData({
            weatherText: weather.msg,
          })
        }
      })

      var hasEquipments = limits && limits.equipments && (limits.equipments.must.length || limits.equipments.can.length || limits.equipments.no.length)
      if (hasEquipments) { // 有就直接读取
        console.log(limits.equipments)
        self.setData({
          equipments: limits.equipments,
        })
        self.createButtonFun()
      } else if (self.data.weather) { // 没有装备，有天气预报，就默认推荐一下
        self.loadEquipments(self.data.weather)
      }
    }
  },

  loadEquipments(weather) {
    var area = this.data.equipments.area
    let equipments = odtools.loadEquipments(this.data.loaded, this.data.date, weather)
    this.setData({
      equipments: equipments,
      "equipments.area": area,
      hasModified: true,
    })
    this.createButtonFun()
  },

  // 恢复默认装备推荐
  async loadDefault() {
    const self = this
    // 没有天气预报，又没有过期，就查询一下
    if (!this.data.od.expired) { // 没过期，又没有给天气预报，则查询天气预报
      await odtools.getWeather(self.data.equipments.area, self.data.date, weather => {
        console.log("weather:", weather)
        if (weather.result) {
          self.setData({
            weather: weather.weather,
            weatherText: odtools.buildWeatherMessage(weather.weather),
          })
          self.loadEquipments(self.data.weather)
        } else {
          self.setData({
            weatherText: weather.msg,
          })
        }
      })
    }
  },

  inputArea(e) {
    console.log(e)
    this.setData({
      "equipments.area": e.detail,
      hasModified: true,
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
      hasModified: true,
      showPopup: false,
    })
  },

  cancelArea() {
    console.log("cancelArea")
    this.setData({
      showPopup: false,
    })
  },

  // 创建编辑/删除按钮对应的函数
  createButtonFun: function() {
    const self = this
    self.data.equipments.must.forEach((item, index) => {
      self["editMust" + index] = () => {
        self.editMust(index)
      }
      self["deleteMust" + index] = () => {
        self.deleteMust(index)
      }
    })

    self.data.equipments.can.forEach((item, index) => {
      self["editCan" + index] = () => {
        self.editCan(index)
      }
      self["deleteCan" + index] = () => {
        self.deleteCan(index)
      }
    })

    self.data.equipments.no.forEach((item, index) => {
      self["editNo" + index] = () => {
        self.editNo(index)
      }
      self["deleteNo" + index] = () => {
        self.deleteNo(index)
      }
    })
  },

  onShow() {
    const self = this
    self.setData({
      equipments: self.data.equipments,
    })
  },

  save: function(e) {
    console.log("save()")
    if (e)
      template.savePersonFormid(app.globalData.personid, e.detail.formId, null)

    if (this.data.hasModified) {
      const self = this;
      console.log(self.data)
      let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
      let prevPage = pages[pages.length - 2];
      prevPage.setData({
        "limits.equipments": self.data.equipments,
      })
      this.data.od.saveItem("limits.equipments")
      this.setData({
        hasModified: false
      })
    }
  },

  onUnload: function() {
    console.log("onUnload()")
    this.save() // 自动保存
  },

  giveup(e) {
    console.log("giveup()")
    template.savePersonFormid(app.globalData.personid, e.detail.formId, null)
    this.data.hasModified = false
    wx.navigateBack({})
  },

  changeMust: function(e) {
    console.log(e)
    this.setData({
      "equipments.mustRes": e.detail,
      hasModified: true,
    })
  },

  changeCan: function(e) {
    console.log(e)
    this.setData({
      "equipments.canRes": e.detail,
      hasModified: true,
    })
  },

  changeNo: function(e) {
    console.log(e)
    this.setData({
      "equipments.no": e.detail,
      hasModified: true,
    })
  },

  deleteMust: function(index) {
    console.log(index)
    const self = this
    self.deleteOne(self.data.equipments.must, self.data.equipments.mustRes, index)
    self.setData({
      "equipments.must": self.data.equipments.must,
      "equipments.mustRes": self.data.equipments.mustRes,
      hasModified: true,
    })
    self.onShow()
  },

  deleteCan: function(index) {
    console.log(index)
    const self = this
    self.deleteOne(self.data.equipments.can, self.data.equipments.canRes, index)
    self.setData({
      "equipments.can": self.data.equipments.can,
      "equipments.canRes": self.data.equipments.canRes,
      hasModified: true,
    })
    self.onShow()
  },

  deleteNo: function(index) {
    console.log(index)
    const self = this
    self.deleteOne(self.data.equipments.no, self.data.equipments.noRes, index)
    self.setData({
      "equipments.no": self.data.equipments.no,
      "equipments.noRes": self.data.equipments.noRes,
      hasModified: true,
    })
    self.onShow()
  },

  deleteOne: function(arr, arrRes, index) {
    console.log(index)
    console.log(arr)
    console.log(arrRes)

    var del = arr.splice(index, 1)
    arrRes.forEach((item, index) => {
      if (item == del) {
        arrRes.splice(index, 1)
      }
    })
    console.log(arr)
    console.log(arrRes)
  },


  editMust: function(index) {
    console.log(index)
    const self = this
    self.setData({
      "dialog.oldName": self.data.equipments.must[index],
      "dialog.newName": self.data.equipments.must[index],
      "dialog.which": "must",
      "dialog.index": index,
      "dialog.show": true,
    })
  },

  editCan: function(index) {
    console.log(index)
    const self = this
    self.setData({
      "dialog.oldName": self.data.equipments.can[index],
      "dialog.newName": self.data.equipments.can[index],
      "dialog.which": "can",
      "dialog.index": index,
      "dialog.show": true,
    })
  },

  editNo: function(index) {
    console.log(index)
    const self = this
    self.setData({
      "dialog.oldName": self.data.equipments.no[index],
      "dialog.newName": self.data.equipments.no[index],
      "dialog.which": "no",
      "dialog.index": index,
      "dialog.show": true,
    })
  },

  inputNewName(e) {
    this.setData({
      "dialog.newName": e.detail,
    })
  },

  onClose(event) {
    const self = this
    console.log(event)
    if (event.detail === 'confirm') {
      // 异步关闭弹窗
      console.log(self.data.dialog)
      if (self.data.dialog.which == "must") {
        self.setData({
          ['equipments.must[' + self.data.dialog.index + ']']: self.data.dialog.newName,
          ['equipments.mustRes[' + self.data.dialog.index + ']']: self.data.dialog.newName,
        })
      } else if (self.data.dialog.which == "can") {
        self.setData({
          ['equipments.can[' + self.data.dialog.index + ']']: self.data.dialog.newName,
          ['equipments.canRes[' + self.data.dialog.index + ']']: self.data.dialog.newName,
        })
      } else if (self.data.dialog.which == "no") {
        self.setData({
          ['equipments.no[' + self.data.dialog.index + ']']: self.data.dialog.newName,
          ['equipments.noRes[' + self.data.dialog.index + ']']: self.data.dialog.newName,
        })
      }

      // setTimeout(() => {
      self.setData({
        hasModified: true,
        "dialog.show": false
      })
      // self.onShow()
      // }, 100);
    } else {
      this.setData({
        "dialog.show": false
      });
    }
  },

  inputMust(e) {
    console.log(e)
    this.setData({
      addMust: e.detail,
    })
  },

  addMust() {
    const self = this
    console.log(self.data.addMust)
    if (self.data.addMust) {
      self.data.equipments.must.push(self.data.addMust)
      self.data.equipments.mustRes.push(self.data.addMust)
      self.setData({
        "equipments.must": self.data.equipments.must,
        "equipments.mustRes": self.data.equipments.mustRes,
        addMust: "",
        hasModified: true,
      })
      self.createButtonFun()
    }
  },

  inputCan(e) {
    console.log(e)
    this.setData({
      addCan: e.detail,
    })
  },

  addCan() {
    const self = this
    console.log(self.data.addCan)
    if (self.data.addCan) {
      self.data.equipments.can.push(self.data.addCan)
      self.data.equipments.canRes.push(self.data.addCan)
      self.setData({
        "equipments.can": self.data.equipments.can,
        "equipments.canRes": self.data.equipments.canRes,
        addCan: "",
        hasModified: true,
      })
      self.createButtonFun()
    }
  },

  inputNo(e) {
    console.log(e)
    this.setData({
      addNo: e.detail,
    })
  },

  addNo() {
    const self = this
    console.log(self.data.addNo)
    if (self.data.addNo) {
      self.data.equipments.no.push(self.data.addNo)
      self.data.equipments.noRes.push(self.data.addNo)
      self.setData({
        "equipments.no": self.data.equipments.no,
        "equipments.noRes": self.data.equipments.noRes,
        addNo: "",
        hasModified: true,
      })
      self.createButtonFun()
    }
  },

})