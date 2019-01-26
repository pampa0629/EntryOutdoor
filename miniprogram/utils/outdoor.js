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
0-10公里部分，距离系数为0.6
10-20公里部分，距离系数为0.7
20-50公里部分，距离系数为0.8
50-100公里部分，距离系数为0.9
爬升系数为： 2-距离系数 */
const calcLevel = (title) => {
  // 归一化
  var length = title.addedLength / 10.0; // 单位：公里
  var up = title.addedUp / 10.0; // 单位：千米
  var lValue = 0; // 距离带来的强度值
  while (length > 0) {
    if (length > 5) {
      lValue += (length - 5) * 0.9;
      length -= 5;
    } else if (length > 2) {
      lValue += (length - 2) * 0.8;
      length -= 2;
    } else if (length > 1) {
      lValue += (length - 1) * 0.7;
      length -= 1;
    } else { // length [0,1]
      lValue += length * 0.6;
      length -= 1;
    }
  }
  var uQuotiety = 2 - lValue / (title.addedLength / 10.0);
  var level = (up * uQuotiety + lValue) / 2;

  // 重装 *1.5，休闲游（如景区）：*0.5
  if (title.loaded == "重装") {
    level *= 1.5
  } else if (title.loaded == "休闲") {
    level *= 0.5
  }
  // 多日活动：除以天数乘以1.5
  console.log(title)
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
      var BMap = new bmap.BMapWX({ak: ak});
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
const buildCarInfo=(traffic)=>{
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
    if (traffic.car.plate) {
      carInfo += "，尾号" + traffic.car.plate
    }
  }
  console.log(carInfo)
  return carInfo
} 

// 移除某个队员（自己退出，或者领队驳回报名），回调返回新成员名单
const removeMember=(outdoorid, personid, callback)=>{
  // 先重新获取members，再删除personid，再调用云函数
  // 刷新一下队员列表
  dbOutdoors.doc(outdoorid).get()
    .then(res => {
      // 先找到personid
      var selfIndex = -1
      for(var i=0; i<res.data.members.length; i++){
        if (res.data.members[i].personid == personid){
          selfIndex = i
          break 
        }
      }
      if(selfIndex == -1){ // 找不到就直接返回
        if (callback){
          callback(res.data.members)
        }
        return 
      }

      const self = res.data.members[selfIndex]
      // 退出的时候应检查一下，如果自己不是替补，则把第一个替补改为“报名中”
      var changeStatus = false;
      if (self.entryInfo.status == "占坑中" || self.entryInfo.status == "报名中") {
        changeStatus = true;
      }
      // 给自己发模板消息
      template.sendQuitMsg2Self(personid, outdoorid, res.data.title.whole, self.userInfo.nickName)
      // 删除自己的
      res.data.members.splice(selfIndex, 1)
      
      // 把第一个替补改为“报名中”
      if (changeStatus) {
        res.data.members.forEach((item, index) => {
          if (changeStatus && item.entryInfo.status == "替补中") {
            item.entryInfo.status = "报名中"
            changeStatus = false // 自己退出，只能补上排在最前面的替补
            // 给替补上的队员发模板消息
            template.sendEntryMsg2Bench(item.personid, outdoorid, res.data.title.whole, item.userInfo.nickName)
          }
        })
      }
      console.log(res.data.members)
      // 云函数
      cloudfun.updateOutdoorMembers(outdoorid, res.data.members, nouse => {
        if(callback){
          callback(res.data.members)
        }
      })
    })
}

// 超过占坑截止时间（外部判断），则清退所有占坑队员，后续替补
const removeOcuppy=(outdoorid, callback)=>{
  dbOutdoors.doc(outdoorid).get().then(res=>{
    const members = res.data.members 
    var count = 0
    // 第一遍循环，找到所有占坑者
    for (var i = 0; i < members.length; i++){
      if (members[i].entryInfo.status=="占坑中") {
        count ++
        // 给被强制退坑者发模板消息
        template.sendQuitMsg2Occupy(members[i].personid, outdoorid, res.data.title.whole, members[i].userInfo.nickName)
        members.splice(i,1)
        i-- // i 要回退一格
      }
    }

    // 第二遍循环，对应的替补队员改为报名
    for (var i = 0; i < members.length && count>0; i++) {
      if (members[i].entryInfo.status == "替补中") {
        count--
        members[i].entryInfo.status == "报名中"
        // 给替补上的队员发模板消息
        template.sendEntryMsg2Bench(members[i].personid, outdoorid, res.data.title.whole, members[i].userInfo.nickName)
      }
    }

    // 删完了还得存到数据库中，调用云函数写入
    cloudfun.updateOutdoorMembers(outdoorid, members, null)

    if (callback){
      callback(members)
    }
  })
}

// 构建剩余时间的文本提示信息
const buildRemainText=(remainMinute) =>{
  var remainText = "";
  if (remainMinute > 0) {
    var remainDay = Math.trunc(remainMinute / 24.0 / 60.0)
    remainMinute -= remainDay * 24 * 60
    var remainHour = Math.trunc(remainMinute / 60)
    remainMinute = Math.trunc(remainMinute - remainHour * 60)
    remainText = remainDay + "天" + remainHour + "小时" + remainMinute + "分钟"
  }
  return remainText
}

// 计算当前距离截止时间还剩余的时间（单位：分钟）
// 若 limitItem 为空，则占坑为前两天22:00；报名为前一天22:00
const calcRemainTime=(outdoorDate, limitItem, isOccupy)=> {
  // console.log(limitItem)
  if (!limitItem) {
    if(isOccupy){
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

module.exports = {
  createTitle: createTitle, // 生成活动标题
  calcLevel: calcLevel, // 计算活动强度
  buildWeatherMessage: buildWeatherMessage, // 构建天气预报字符串
  getWeather: getWeather, // 获取天气预报
  loadEquipments: loadEquipments, // 推荐的装备
  buildCarInfo: buildCarInfo, // 构建车辆信息

  buildRemainText: buildRemainText, // 构造剩余时间提示文字
  calcRemainTime:calcRemainTime, // 计算占坑或报名的剩余时间

  removeMember: removeMember, // 移除某个队员（自己退出，或者领队驳回报名）
  removeOcuppy: removeOcuppy, // 清退占坑队员
}