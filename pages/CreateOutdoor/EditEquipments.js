const util = require('../../utils/util.js')
const outdoor = require('../../utils/outdoor.js')
const area = require('../../libs/area.js')

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
    loaded: null, // 负重情况
    weatherText: "", // 天气预报文本
    date:null, // 活动日期
    isOutDate:false, // 活动是否过期
    hasModified: false,

    area:"", // 选中的地区
    areaList: null, // 地区列表
    showPopup:false, // 是否显示弹窗
    
    dialog:{
      show:false,
      oldName:"", // 原来的装备名称
      newName:"", // 新的装备名称
    }
  },

  onLoad: function(options) {
    const self = this
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    let data = pages[pages.length - 3].data

    self.setData({
      loaded: data.title.loaded,
      date: data.title.date,
      areaList: area.default, // 系统默认
    })

    // 处理过期活动
    if ((new Date()) > new Date(data.title.date)){ // 过期活动，不能用天气预报，也就无法推荐装备了
      self.setData({
        isOutDate:true,
        weatherText: "活动过期，无法获取天气预报，系统也无法推荐装备",
      })
    }

    var hasEquipments = prevPage.data.limits && prevPage.data.limits.equipments && (prevPage.data.limits.equipments.must.length || prevPage.data.limits.equipments.can.length || prevPage.data.limits.equipments.no.length)
    if (hasEquipments) { // 有就直接读取
      console.log(prevPage.data.limits.equipments)
      self.setData({
        equipments: prevPage.data.limits.equipments,
        hasModified: prevPage.data.hasModified,
      })
      self.createButtonFun()
    }
  },

  inputArea(e){
    console.log(e)
    this.setData({
      area:e.detail,
    })
  },

  onPopup(){
    console.log("onPopup")
    this.setData({
      showPopup:true,
    })
  },

  closePopup(){
    console.log("closePopup")
    this.setData({
      showPopup: false,
    })
  },

  confirmArea(e){
    console.log("confirmArea")
    console.log(e)
    this.setData({
      showPopup: false,
    })
    this.changeArea(e)
  },

  changeArea(e){
    console.log("changeArea")
    console.log(e)
    var area=""
    e.detail.values.forEach((item, index)=>{
      area += item.name
    })
    this.setData({
      area: area,
    })
  },

  cancelArea(){
    console.log("cancelArea")
    this.setData({
      showPopup: false,
    })
  },

  // 创建编辑/删除按钮对应的函数
  createButtonFun:function(){
    const self = this
    self.data.equipments.must.forEach((item, index)=>{
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

  // 恢复默认装备推荐
  loadDefault:function(){
    const self = this
    if (!self.data.isOutDate) { // 没过期，则查询天气预报
      outdoor.getWeather(self.data.area, self.data.date, weather => {
        if (weather.result) {
          self.setData({
            weather: weather.weather,
            weatherText: outdoor.buildWeatherMessage(weather.weather),
          })
          outdoor.loadEquipments(self.data.loaded, self.data.date, weather.weather, equipments => {
            self.setData({
              equipments: equipments,
              hasModified: true,
            })
            self.createButtonFun()
          })
        } else {
          self.setData({
            weatherText: weather.msg,
          })
        }
      })
    } 
  },

  onShow(){
    const self = this
    self.setData({
      equipments: self.data.equipments,
    })
  },

  onUnload: function() {
    const self = this;
    console.log(self.data)
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    prevPage.setData({
      "limits.equipments": self.data.equipments,
      hasModified: self.data.hasModified,
    })
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

  deleteMust: function (index) {
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

  deleteCan: function (index) {
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

  deleteNo: function (index) {
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

  deleteOne:function(arr, arrRes, index){
    console.log(index)
    console.log(arr)
    console.log(arrRes)
    
    var del = arr.splice(index, 1)
    arrRes.forEach((item, index)=>{
      if(item == del){
        arrRes.splice(index, 1)
      }
    })
    console.log(arr)
    console.log(arrRes)
  },


  editMust: function (index) {
    console.log(index)
    const self = this
    self.setData({
      "dialog.oldName": self.data.equipments.must[index],
      "dialog.newName": self.data.equipments.must[index],
      "dialog.which":"must",
      "dialog.index": index,
      "dialog.show": true,
    })
  },

  editCan: function (index) {
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

  editNo: function (index) {
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

  inputNewName(e){
    this.setData({
      "dialog.newName":e.detail,
    })
  },

  onClose(event) {
    const self = this
    console.log(event)
    if (event.detail === 'confirm') {
      // 异步关闭弹窗
      console.log(self.data.dialog)
      if(self.data.dialog.which=="must"){
        self.setData({
          ['equipments.must[' + self.data.dialog.index + ']']: self.data.dialog.newName,
          ['equipments.mustRes[' + self.data.dialog.index + ']']: self.data.dialog.newName,
        })
      } else if(self.data.dialog.which=="can"){
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

      setTimeout(() => {
        self.setData({
          hasModified: true,
          "dialog.show": false
        });
        self.onShow()
      }, 100);
    } else {
      this.setData({
        "dialog.show": false
      });
    }
  },

  inputMust(e){
    console.log(e)
    this.setData({
      addMust:e.detail,
    })
  },

  addMust(){
    const self = this
    console.log(self.data.addMust)
    if(self.data.addMust){
      self.data.equipments.must.push(self.data.addMust)
      self.data.equipments.mustRes.push(self.data.addMust)
      self.setData({
        "equipments.must": self.data.equipments.must,
        "equipments.mustRes": self.data.equipments.mustRes,
        addMust:"",
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