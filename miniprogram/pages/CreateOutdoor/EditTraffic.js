const select = require('../../libs/select.js')
const odtools = require('../../utils/odtools.js')

Page({
 
  data: {
    Modes: ["公共交通", "包车", "自驾"],
    traffic: {
      mode: "公共交通", // 包车，自驾，公共交通
      cost: null, // 费用AA，自理（公交时），免费（市内自驾）
      money: 50, // 大约多少钱
      car: {
        carInfo: "", // 汇总显示的车辆信息
        brand: "", // 车型(包车/自驾时选用) 
        color: "", // 颜色 
        plate: "", // 车牌号码(后四位)
      },
    },
    hasModified: false,

    showBrandPopup: false,
    showColorPopup: false,
    Brands: null,
    Colors: null,
  },

  onLoad: function(options) {
    const self = this;
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    if (prevPage.data.traffic) {
      self.setData({
        traffic: prevPage.data.traffic,
      })
    }
    self.flashByMode()
    self.setData({
      Brands: select.brand,
      Colors: ["黑色", "白色", "棕色", "红色", "绿色", "银色", "黄色", "橙色", "其它"],
      hasModified: prevPage.data.hasModified,
    })
  },

  onUnload: function() {
    const self = this;
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    prevPage.setData({
      traffic: self.data.traffic,
      "traffic.carInfo": odtools.buildCarInfo(self.data.traffic),
      "traffic.costInfo": odtools.buildCostInfo(self.data.traffic),
      hasModified: self.data.hasModified,
      "modifys.traffic": self.data.hasModified,
    })
  },

  clickMode(e) {
    console.log(e)
    this.setData({
      "traffic.mode": e.currentTarget.dataset.value,
      hasModified: true,
    })
    console.log(this.data.traffic.mode)
    this.flashByMode()
  },

  flashByMode() {
    const self = this
    if (this.data.traffic.mode == "公共交通") {
      this.setData({
        Costs: ["费用自理"], 
        "traffic.cost": "费用自理",
      })
    } else if (this.data.traffic.mode == "包车") {
      this.setData({
        Costs: ["费用AA"],
        "traffic.cost": "费用AA",
      })
    } else if (this.data.traffic.mode == "自驾") {
      this.setData({
        Costs: ["费用AA", "免费"],
      })
    }
  },

  clickCost(e) {
    console.log(e)
    this.setData({
      "traffic.cost": e.currentTarget.dataset.value,
      hasModified: true,
    })
    console.log(this.data.traffic.cost)
  },

  bindAddMoney(e) {
    console.log(e)
    this.setData({
      "traffic.money": e.detail,
      hasModified: true
    })
  },

  onBrandPopup() {
    console.log("onBrandPopup")
    console.log(this.data.Brands)
    this.setData({
      showBrandPopup: true,
    })
  },

  closeBrandPopup() {
    console.log("closeBrandPopup")
    this.setData({
      showBrandPopup: false,
    })
  },

  inputBrand(e) {
    console.log("inputBrand")
    console.log(e)
    const self = this
    self.setData({
      "traffic.car.brand": e.detail,
      hasModified: true
    })
  },

  confirmBrand(e) {
    console.log("confirmBrand")
    console.log(e)
    this.setData({
      "traffic.car.brand": e.detail.values[1].name,
      hasModified: true,
      showBrandPopup: false,
    })
  },

  inputColor(e) {
    console.log(e)
    const self = this
    self.setData({
      "traffic.car.color": e.detail,
      hasModified: true
    })
  },

  changeColor(e) {
    console.log(e)
    const self = this
    self.setData({
      "traffic.car.color": self.data.Colors[e.detail.value],
      hasModified: true
    })
    console.log(self.data.traffic.car.color)
  },

  changeNumber(e) {
    console.log(e)
    const self = this
    this.setData({
      "traffic.car.number": e.detail,
      hasModified: true
    })
    console.log(self.data.traffic.car.number)
  },

})