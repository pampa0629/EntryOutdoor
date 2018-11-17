const app = getApp()
const util = require('./util.js')
var bmap = require('../libs/bmap-wx.min.js');
 
// 根据各类信息，生成活动主题信息，修改whole
const createTitle = (title, nickName)=> {
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
const calcLevel=(title)=> {
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
  var message = weather.city + "，"
  message += weather.date + "，"
  message += weather.weather + "，"
  message += weather.temperature + "，"
  message += weather.wind
  return message
}

// 根据城市和日期，查看天气预报
// todo 可指定城市
const getWeather = (city, date, callback) => {
  var BMap = new bmap.BMapWX({ak: 'zGuNHdYow4wGhrC1IytHDweHPWGxdbaX'}); 
  BMap.weather({
    fail: function(fail){},
    success: function(res){
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
        if (index >= forecast.length){
          index = forecast.length - 1
        }
      }
      console.log("outdoorDay is:" + outdoorDay)
      console.log("nowDay is:" + nowDay)
      console.log("lastDay is:" + lastDay)
      console.log(index)
      var weather = null
      if (index >= 0 && index < forecast.length){
        weather = forecast[index]
        weather.city = res.originalData.results[0].currentCity
      }
      console.log(weather)
      if (callback) {
        callback(weather)
      }
    }
  })
}

// 把天气预报的结果转换一个户外装备需要的表达方式
const convertWeather = weather=> {
  var result = {
    temperature: "normal",
    wind: "",
    weather: ""
  }
  // 最高温
  var high = parseInt(weather.temperature.splite("~")[0])
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

// 根据负重类型和活动日期，得到默认的装备列表
// 根据地区和日期，得到天气预报，再推荐合适的装备（防雨、防晒、保温等）
const loadEquipments = (loaded, date, weather, callback)=> {
  var e = {}
  weather = convertWeather(weather)
  console.log(weather)
  e.mustRes = ["身份证", "零钱"]
  e.must = ["身份证", "零钱"]
  e.canRes = ["相机", "常备药品（止疼/止血/止泻/发烧感冒）", "充电宝", "小刀"]
  e.can = ["相机", "常备药品（止疼/止血/止泻/发烧感冒）", "充电宝", "小刀"]

  if (loaded == "休闲") { // 休闲的就不操心了
    e.mustRes.push("腐败物质") // 结果
    e.must.push("腐败物质") // 候选，可以多一些
  } else {
    e.mustRes.push("登山鞋", "头灯/手电") // 结果
    e.must.push("登山鞋", "头灯/手电") // 候选，可以多一些
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
      e.mustRes.push("冲锋衣") // 结果
      e.must.push("冲锋衣") // 候选，可以多一些
    }

    // 看天气情况推荐：天晴下雨
    if (weather.weather == "sunny") {
      e.canRes.push("遮阳帽") // 结果
      e.can.push("遮阳帽", "防晒霜") // 候选，可以多一些
    } else if (weather.weather == "rain") {
      e.mustRes.push("雨披") // 结果
      e.must.push("雨披") // 候选，可以多一些
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

  if(callback){
    callback(e)
  }
}

module.exports = {
  createTitle: createTitle, // 生成活动标题
  calcLevel: calcLevel, // 计算活动强度
  buildWeatherMessage: buildWeatherMessage, // 构建天气预报字符串
  getWeather: getWeather, // 获取天气预报
  loadEquipments: loadEquipments, // 推荐的装备
}