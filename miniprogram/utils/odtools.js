const app = getApp()
const util = require('./util.js')
var bmap = require('../libs/bmap-wx.min.js')
const cloudfun = require('./cloudfun.js')
const template = require('./template.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')

// 根据各类信息，生成活动主题信息，修改whole
const createTitle = (title, nickName) => {
  var result = "" // 2018.09.16（周日）大觉寺一日轻装1.0强度休闲游； 
  // 日期 
  if (title.date) {
    result += title.date
    result += "(" + util.getDay(title.date) + ")"
  } else {
    result += "日期待定"
  }
  // 地点
  if (title.place) {
    result += title.place
  } else {
    result += "地点待定"
  }
  // 时长
  result += title.during
  // 轻装or重装
  result += title.loaded
  // 强度
  result += "强度" + title.level
  // 领队
  result += nickName + "队"
  return result
}

// 计算户外活动强度
/**强度计算公式，原则：按照鼓励爬升，弱化距离的原则；但超长距离的弱化程度会降低。
先归一化：公里数/10，爬升米数/1000
公式：求和（分段距离*距离系数）+爬升高度*爬升系数
50-100公里部分，距离系数为0.4
20-50公里部分，距离系数为0.5
10-20公里部分，距离系数为0.6
0-10公里部分，距离系数为0.7
爬升系数为： 2-距离系数 */
const calcLevel = (title) => {
  // 归一化
  var length = title.addedLength / 10.0; // 单位：公里
  var up = title.addedUp / 10.0; // 单位：千米
  var lValue = 0; // 距离带来的强度值
  while (length > 0) {
    if (length > 5) {
      lValue += (length - 5) * 0.4;
      length = 5;
    } else if (length > 2) {
      lValue += (length - 2) * 0.5;
      length = 2;
    } else if (length > 1) {
      lValue += (length - 1) * 0.6;
      length = 1;
    } else { // length [0,1]
      lValue += length * 0.7;
      length = 0;
    }
  }
  var uQuotiety = 2 - lValue / (title.addedLength / 10.0);
  var level = (up * uQuotiety + lValue) / 2;
  // console.log(title)
  // console.log("up:" + up)
  // console.log("value:" + lValue)
  // console.log("uQuotiety:" + uQuotiety)
  // console.log("level:" + level)

  // 重装 *1.5，休闲游（如景区）：*0.5
  if (title.loaded == "重装") {
    level *= 1.5
  } else if (title.loaded == "休闲") {
    level *= 0.5
  }
  // 多日活动：除以天数乘以1.5
  // console.log(title)
  var duringCount = util.parseChar(title.during[0])
  if (duringCount > 1) {
    level = level * 1.5 / (duringCount + 1)
  }

  // 领队调节强度系数
  if (title.adjustLevel != null) {
    level *= title.adjustLevel / 100.0;
  }
  return level.toFixed(1)
}

// 把天气预报的请求结果构建为人可阅读的文字
const buildWeatherMessage = (weather) => {
  console.log(weather)
  var message = weather.area + "，"
  message += weather.date + "，"
  message += weather.weather + "，"
  message += weather.temperature + "，"
  message += weather.wind
  return message
}

const getLocation = (callback) => {
  wx.getSetting({
    success(res) {
      if (!res.authSetting['scope.userLocation']) {
        wx.authorize({
          scope: 'scope.userLocationscope.userLocation',
          success() {
            console.log('scope.userLocationv OK')
            wx.getLocation({
              type: 'wgs84',
              success: function(res) {
                if (callback) {
                  callback(res)
                }
              }
            })
          },
          fail() {
            wx.showModal({
              title: '请给予授权',
              content: '授权获取大致位置，才能通过所在城市的天气预报推荐装备，不然装备推荐不准。小程序不会记录您的位置',
            })
          }
        })
      } else {
        wx.getLocation({
          type: 'wgs84',
          success: function(res) {
            if (callback) {
              callback(res)
            }
          }
        })
      }
    }
  })
}

// 根据地区和日期，查看天气预报
const getWeather = (area, date, callback) => {
  var ak = "zGuNHdYow4wGhrC1IytHDweHPWGxdbaX"
  wx.request({ // 通过area得到经纬度
    url: "https://api.map.baidu.com/geocoder/v2/?address=" + area + "&output=json&ak=" + ak,
    fail: function(error) {
      console.log(error)
      if (callback) {
        callback({
          result: false,
          msg: area + "转化经纬度失败，具体原因是：" + error
        })
      }
    },
    success: function(res) {
      console.log(res);
      var latitude = res.data.result.location.lat //维度
      var longitude = res.data.result.location.lng //经度
      var BMap = new bmap.BMapWX({
        ak: ak
      });
      BMap.weather({
        location: longitude + "," + latitude,
        fail: function(error) {
          console.log(error)
          if (callback) {
            callback({
              result: false,
              msg: "获取天气预报失败，具体原因是：" + error
            })
          }
        },
        success: function(res) {
          console.log(res)
          let forecast = res.originalData.results[0].weather_data
          console.log(forecast)
          var nowDay = new Date()
          var lastDay = new Date()
          lastDay.setDate(nowDay.getDate() + forecast.length)
          var outdoorDay = new Date(date)
          var index = forecast.length - 1 // 用哪天的数据
          if (lastDay >= outdoorDay) {
            index = Math.ceil((outdoorDay.getTime() - nowDay.getTime()) / (1000 * 60 * 60 * 24));
            if (index >= forecast.length) {
              index = forecast.length - 1
            }
          }
          console.log("outdoorDay is:" + outdoorDay)
          console.log("nowDay is:" + nowDay)
          console.log("lastDay is:" + lastDay)
          console.log(index)
          var weather = null
          if (index >= 0 && index < forecast.length) {
            weather = forecast[index]
            weather.area = area
          }
          console.log(weather)
          if (callback) {
            callback({
              result: true,
              weather: weather
            })
          }
        }
      })
    }
  })

}

// 把天气预报的结果转换一个户外装备需要的表达方式
const convertWeather = weather => {
  var result = {
    temperature: "normal",
    wind: "",
    weather: ""
  }
  // 最高温
  var high_low = weather.temperature.split("~")
  var high = parseInt([0])
  console.log("high: " + high)
  if (high >= 25) {
    result.temperature = "hot"
  } else if (high <= 10) {
    result.temperature = "cold"
  }
  // 风力
  var wind = util.myParseInt(weather.wind)
  console.log("wind: " + wind)
  if (wind > 5) {
    result.wind = "big"
  }
  // 晴天雨天
  if (weather.weather.indexOf("晴") != -1) {
    result.weather = "sunny"
  } else if (weather.weather.indexOf("雨") != -1) {
    result.weather = "rain"
  }
  return result
}

// 根据日期模拟天气
const simulateWeather = (date) => {
  var weather = {
    temperature: "normal",
    wind: "",
    weather: ""
  }
  // 也就只能判断一下月份了
  var month = (new Date(date)).getMonth()
  if (month > 5 && month < 10) { // 6-9 为夏季
    weather.temperature = "hot"
  } else if (month > 10 || month < 4) { // 11-4 为冬季
    weather.temperature = "cold"
  }
  return weather
}

// 根据负重类型和活动日期，得到默认的装备列表
// 根据地区和日期，得到天气预报，再推荐合适的装备（防雨、防晒、保温等）
const loadEquipments = (loaded, date, weather, callback) => {
  var e = {}
  if (weather) {
    weather = convertWeather(weather)
  } else { // 获取天气预报失败，则这里模拟一下天气情况
    weather = simulateWeather(date)
  }

  console.log(weather)
  e.mustRes = ["身份证", "零钱"]
  e.must = ["身份证", "零钱"]
  e.canRes = ["相机", "常备药品（止疼/止血/止泻/发烧感冒）", "充电宝", "小刀"]
  e.can = ["相机", "常备药品（止疼/止血/止泻/发烧感冒）", "充电宝", "小刀"]

  if (loaded == "休闲") { // 休闲的就不操心了
    e.mustRes.push("腐败物质") // 结果
    e.must.push("腐败物质") // 候选，可以多一些
  } else {
    e.mustRes.push("登山鞋", "头灯") // 结果
    e.must.push("登山鞋", "头灯") // 候选，可以多一些
    e.canRes.push("登山杖", "护膝", "魔术头巾", "手台", "户外GPS", "腐败物质") // 结果
    e.can.push("登山杖", "护膝", "魔术头巾", "手台", "户外GPS", "腐败物质") // 候选，可以多一些
    e.noRes = ["棉质内衣", "高跟鞋/皮鞋"]
    e.no = ["棉质内衣", "高跟鞋/皮鞋"]

    var water = 1 // 女生最少1升水
    // 看天气情况推荐：温度
    if (weather.temperature == "hot") {
      e.mustRes.push("速干衣裤") // 结果
      e.must.push("速干衣裤") // 候选，可以多一些
      water *= 2
    } else if (weather.temperature == "cold") {
      e.mustRes.push("排汗内衣", "手套", "抓绒衣", "保暖外套") // 结果
      e.must.push("排汗内衣", "手套", "抓绒衣", "保暖外套") // 候选，可以多一些
      e.canRes.push("保暖帽", "保温杯") // 结果
      e.can.push("冰爪", "雪套", "保暖帽", "保温杯", "墨镜") // 候选，可以多一些
    } else { // 适宜温度
      water *= 1.5
    }

    // 看天气情况推荐：刮风
    if (weather.wind == "big") {
      e.mustRes.push("冲锋衣")
      e.must.push("冲锋衣")
    }

    // 看天气情况推荐：天晴下雨
    if (weather.weather == "sunny") {
      e.canRes.push("遮阳帽")
      e.can.push("遮阳帽", "防晒霜")
      water *= 1.2
    } else if (weather.weather == "rain") {
      e.mustRes.push("雨披")
      e.must.push("雨披")
      water *= 0.8
    }

    // 看轻装还是重装推荐
    if (loaded == "轻装") {
      e.mustRes.push("双肩背包", "简便午餐") // 结果
      e.must.push("双肩背包", "简便午餐") // 候选，可以多一些
    } else if (loaded == "重装") {
      e.mustRes.push("重装包（男55升+/女50升+）", "防雨罩", "帐篷", "睡袋", "防潮垫/气垫", "炉头", "气罐", "打火机", "锅碗筷", "适量食物")
      e.must.push("重装包（男55升+/女50升+）", "防雨罩", "帐篷", "睡袋", "防潮垫/气垫", "炉头", "气罐", "打火机", "锅碗筷", "适量食物")
      e.canRes.push("水壶", "羽绒服")
      e.can.push("过滤器", "水壶", "水桶", "眼罩耳塞", "充气枕", "羽绒服", "卫生纸", "洗漱用品", "换洗衣袜")
      water *= 1.5
    }

    // 水，最小计量为 0.5升（一瓶），往上取值；男生是女生的1.5倍
    var waterGG = (Math.ceil(water * 1.5 * 2) / 2).toFixed(1)
    var waterMM = (Math.ceil(water * 2) / 2).toFixed(1)
    var waterRes = "水（男" + waterGG + "升/女" + waterMM + "升，酌情调整）"
    e.mustRes.push(waterRes)
    e.must.push(waterRes)
  }

  if (callback) {
    callback(e)
  }
}

// 把车辆信息输出为一个短语
const buildCarInfo = (traffic) => {
  var carInfo = ""
  if (traffic.mode == "公共交通") {
    carInfo = "无"
  } else if (traffic.car) {
    if (traffic.car.brand) {
      carInfo += traffic.car.brand
    }
    if (traffic.car.color) {
      carInfo += "，" + traffic.car.color
    }
    if (traffic.car.number) {
      carInfo += "，车牌" + traffic.car.number
    }
  }
  console.log(carInfo)
  return carInfo
}

// 构建费用信息 {{traffic.cost=='免费'?'免费':'大致费用：'+traffic.money+'元'}}
const buildCostInfo = (traffic) => {
  var costInfo = traffic.cost
  if (costInfo != '免费') {
    costInfo += "，大致费用：" + traffic.money + '元'
  }
  console.log(costInfo)
  return costInfo
}

// 提醒占坑队员，占坑截止时间临近  
const remindOcuppy = (od, callback) => {
  console.log("odtools.remindOcuppy()")

  dbOutdoors.doc(od.outdoorid).get().then(res => {
    const members = res.data.members
    var temp = calcRemainTime(od.title.date, od.limits.ocuppy, true)
    var remain = buildRemainText(calcRemainTime(od.title.date, od.limits.ocuppy, true))
    console.log("temp:", temp)
    console.log("remain:", remain)

    // 循环，找到所有占坑者
    for (var i = 0; i < members.length; i++) {
      if (members[i].entryInfo.status == "占坑中" && !members[i].remained) {
        // 给占坑者发模板消息
        template.sendRemindMsg2Ocuppy(members[i].personid, od.outdoorid, od.title.whole, remain, od.leader.userInfo.nickName, od.members.length + od.addMembers.length)
        members[i].remained = true
      }
    }

    cloudfun.updateOutdoorMembers(od.outdoorid, members, null)
  })
}

// 超过占坑截止时间（外部判断），则清退所有占坑队员，后续替补
const removeOcuppy = (outdoorid, callback) => {
  console.log("odtools.removeOcuppy()")
  dbOutdoors.doc(outdoorid).get().then(res => {
    const members = res.data.members
    var count = 0
    // 第一遍循环，找到所有占坑者
    for (var i = 0; i < members.length; i++) {
      if (members[i].entryInfo.status == "占坑中") {
        console.log(i, JSON.stringify(members[i]))
        count++
        // 给被强制退坑者发模板消息
        template.sendQuitMsg2Occupy(members[i].personid, outdoorid, res.data.title.whole, res.data.title.date, res.data.members[0].userInfo.nickName, members[i].userInfo.nickName)
        members.splice(i, 1)
        i-- // i 要回退一格
      }
    }

    // 第二遍循环，对应的替补队员改为报名
    for (var i = 0; i < members.length && count > 0; i++) {
      if (members[i].entryInfo.status == "替补中") {
        console.log(i, JSON.stringify(members[i]))
        count--
        members[i].entryInfo.status = "报名中"
        // 给替补上的队员发模板消息
        template.sendEntryMsg2Bench(members[i].personid, outdoorid, res.data.title.whole, members[i].userInfo.nickName)
      }
    }

    // 删完了还得存到数据库中，调用云函数写入
    cloudfun.updateOutdoorMembers(outdoorid, members, null)

    if (callback) {
      callback(members)
    }
  })
}

// 构建剩余时间的文本提示信息
const buildRemainText = (remainMinute) => {
  var remainText = "";
  if (remainMinute > 0) {
    var remainDay = Math.trunc(remainMinute / 24.0 / 60.0)
    remainMinute -= remainDay * 24 * 60
    var remainHour = Math.trunc(remainMinute / 60)
    remainMinute = Math.trunc(remainMinute - remainHour * 60)
    if (remainDay > 0) {
      remainText += remainDay + "天"
    }
    if (remainHour > 0) {
      remainText += remainHour + "小时"
    }
    remainText += remainMinute + "分钟"
  }
  return remainText
}

// 计算当前距离截止时间还剩余的时间（单位：分钟）
// 若 limitItem 为空，则占坑为前两天22:00；报名为前一天22:00
const calcRemainTime = (outdoorDate, limitItem, isOccupy) => {
  // console.log(limitItem)
  if (!limitItem) {
    if (isOccupy) {
      limitItem = {
        date: "前两天",
        time: "22:00"
      }
    } else {
      limitItem = {
        date: "前一天",
        time: "22:00"
      }
    }
  }
  //console.log(outdoorDate)
  //console.log(limitItem)
  var outdoorMinute = Date.parse(util.Ymd2Mdy(outdoorDate)) / 1000.0 / 60 // 得到活动日期的分钟时间数
  var dayCount = util.getLimitDateIndex(limitItem.date)
  console.log("dayCount:" + dayCount)
  var minute = 24 * 60; // 一天多少分钟
  //console.log(limitItem.time)
  if (limitItem.time) {
    var hour_minute = limitItem.time.split(":")
    minute = minute - (parseInt(hour_minute[0]) * 60 + parseInt(hour_minute[1]))
    //console.log("hour_minute:" + hour_minute)
    //console.log("minute:" + minute)
  }
  minute += (dayCount - 1) * 24 * 60 // 截止时间和活动日期两者之间间隔的分钟数
  //console.log("minute" + minute)
  var limitMinute = outdoorMinute - minute // 截止时间的分钟数

  var nowMinute = Date.parse(new Date()) / 1000.0 / 60
  var remainMinute = limitMinute - nowMinute

  //console.log(remainMinute)
  return remainMinute
}

const getChatStatus = (personid, nickName, chat, callback) => {
  if (chat && chat.messages) {
    var count = 0
    if (chat.seen && chat.seen[personid]) {
      count = chat.seen[personid]
    }

    var status = ""
    if (chat.messages.length > count) {
      for (var i = count; i < chat.messages.length; i++) {
        console.log(chat.messages[i])
        const message = chat.messages[i]
        if (message.msg.indexOf("@" + nickName) != -1 || message.msg.indexOf("@所有人") != -1) {
          status = "atme"
        } else if (message.at && (message.at == nickName || message.at == "所有人")) {
          status = "atme"
        }
      }
      if (status == "") {
        status = "new"
      }
    }
    if (callback) {
      callback(status)
    }
  }
}

const buildChatMessage = (msg) => {
  var message = {}
  //  { who: "", msg: "", personid:"", self: false},
  message.personid = app.globalData.personid
  if (app.globalData.personid) {
    message.who = app.globalData.userInfo.nickName
  } else {
    message.who = "游客"
  }
  message.msg = msg
  message.self = true // 肯定是自己了
  return message
}

const findPersonIndex = (members, personid, callback) => {
  members.forEach((item, index) => {
    if (item.personid == personid) {
      if (callback) {
        callback(index)
      }
    }
  })
}

const drawText = (canvas, text, x, y, size, dy, color) => {
  canvas.font = size + "px sans-serif" //  "normal bold 12px cursive"
  canvas.fillStyle = color
  canvas.fillText(text, x, y)
  return {
    x: x,
    y: y + size + dy
  }
}

const drawShareCanvas = (canvas, od, callback) => {
  console.log("odtools.drawShareCanvas")

  var green = "#1aad19",
    pos = {
      x: 10,
      y: 35
    },
    dx = 35
  // 领队
  pos = drawText(canvas, "领队：" + od.leader.userInfo.nickName, pos.x, pos.y, 30, 15, green)

  // 集合地点
  pos = drawText(canvas, "集合时间及地点", pos.x, pos.y, 30, 10, green)
  od.meets.forEach((item, index) => {
    var message = +(index + 1) + "）" + (item.date ? item.date : '当天') + " " + (item.time ? item.time : ' ')
    pos = drawText(canvas, message, pos.x, pos.y, 24, 5, green)
    pos = drawText(canvas, item.place, pos.x + dx, pos.y, 24, 10, green)
    pos.x -= dx
  })

  // 人数
  var countText = "已参加人数：" + (od.members.length + od.addMembers.length)
  if (od.limits.maxPerson) {
    countText += "，本活动限" + od.limits.personCount + "人"
  } else {
    countText += "，本活动不限人数"
  }
  pos = drawText(canvas, countText, pos.x, pos.y + 5, 30, 10, green)

  // 活动状态
  pos = drawText(canvas, "活动状态：" + od.status, pos.x, pos.y + 5, 30, 15, green)

  canvas.draw(false, function(res) {
    console.log('canvas.draw done...')
    wx.canvasToTempFilePath({
      canvasId: 'shareCanvas',
      width: 500,
      height: 400,
      destWidth: 500,
      destHeight: 400,
      success: res => {
        if (callback) {
          callback(res.tempFilePath)
        }
      }
    })
  })
}

const setCFO = (outdoorid, cfo) => {
  dbOutdoors.doc(outdoorid).get().then(res => {
    var pay = {}
    if (res.data.pay) {
      pay = res.data.pay
    }
    pay.cfo = cfo
    cloudfun.updateOutdoorPay(outdoorid, pay)
    // 发模板消息
    template.sendAppointMsg2CFO(cfo.personid, outdoorid, res.data.title.whole, cfo.nickName)
  })
}

// 设置我的活动费用支付结果
const setPayMine = (outdoorid, personid, mine) => {
  dbOutdoors.doc(outdoorid).get().then(res => {
    const pay = res.data.pay
    if (!pay.results) {
      pay.results = {}
    }
    pay.results[personid] = mine
    cloudfun.updateOutdoorPay(outdoorid, pay)
  })
}

const isEntriedStatus = (status) => {
  if (status == "占坑中" || status == "报名中" || status == "替补中") {
    return true
  }
  return false
}

const getDefaultWebsites = () => {
  return {
    lvyeorg: {
      fid: null, // 版块id
      tid: null, // 帖子id
      qrcodeUrl: null, // 报名二维码
      // keepSame: (app.globalData.lvyeorgInfo ? app.globalData.lvyeorgInfo.keepSame : false),
      // isTesting: (app.globalData.lvyeorgInfo ? app.globalData.lvyeorgInfo.isTesting : false),
      waitings: [], // 要同步但尚未同步的信息列表
    }
  }
}

// 是否报名已满员；满员后就只能替补，不能报名/占坑
const entryFull = (limits, members, addMembers) => {
  var full = false
  if (limits.maxPerson && (members.length + addMembers.length) >= limits.personCount) {
    full = true
  }
  return full
}

const getWebsites = (outdoorid, callback) => {
  dbOutdoors.doc(outdoorid).get().then(res => {
    if (callback) {
      callback(res.data.websites)
    }
  })
}

// 判断某个时刻退出活动是否需要AA费用
// 需要A费用的条件（必须全部满足）：活动已成行，有AA规则，报名状态为“报名中”，无人替补
const isNeedAA = (od, entryStatus) => {
  var result = false
  if (od.status == "已成行" && od.limits.isAA && entryStatus == "报名中") {
    result = true
    od.members.forEach((item, index) => {
      if (item.entryInfo.status == "替补中") {
        result = false
      }
    })
  }
  return result
}

module.exports = {
  createTitle: createTitle, // 生成活动标题
  calcLevel: calcLevel, // 计算活动强度
  buildWeatherMessage: buildWeatherMessage, // 构建天气预报字符串
  getWeather: getWeather, // 获取天气预报
  loadEquipments: loadEquipments, // 推荐的装备
  buildCarInfo: buildCarInfo, // 构建车辆信息
  buildCostInfo: buildCostInfo, // 构建费用信息
  entryFull: entryFull, // 是否已经满员

  isEntriedStatus: isEntriedStatus, // 是否属于报名状态，包括报名中、占坑中和替补中

  buildRemainText: buildRemainText, // 构造剩余时间提示文字
  calcRemainTime: calcRemainTime, // 计算占坑或报名的剩余时间

  // removeMember: removeMember, // 移除某个队员（自己退出，或者领队驳回报名）
  removeOcuppy: removeOcuppy, // 清退占坑队员
  remindOcuppy: remindOcuppy, // 提醒占坑队员，占坑截止时间临近
  isNeedAA: isNeedAA, // 判断某个时刻退出活动是否需要AA费用

  getWebsites: getWebsites, // 得到数据库中的网站同步结构

  getChatStatus: getChatStatus, // 判断留言的状态：self、new等
  buildChatMessage: buildChatMessage, // 构建一条留言

  findPersonIndex: findPersonIndex, // 从Members数组中找到自己的index

  setCFO: setCFO, // 设置财务官
  setPayMine: setPayMine, // 设置我的活动费用支付结果

  // 绘制画布
  drawShareCanvas: drawShareCanvas, // 绘制分享的画布

  // 得到默认的websites信息
  getDefaultWebsites: getDefaultWebsites,

}