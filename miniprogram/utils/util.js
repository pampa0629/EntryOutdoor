//console.log(".js in  fun, e is:" + JSON.stringify(e, null, 2))
//console.log(".js in  fun, e is:" + e)

const app = getApp()
wx.cloud.init()
const db = wx.cloud.database()
const dbPersons = db.collection('Persons')
 
const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate() 
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}

// 把2018-11-01的日期格式，转化为11/02/2018的格式
const Ymd2Mdy = (date) => {
  var dates = date.split("-")
  return dates[1] + "/" + dates[2] + "/" + dates[0]
}

const nextDate = (date, num) => {
  var next = new Date()
  next.setDate(date.getDate() + num)
  return next
}

const formatDate = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  return [year, month, day].map(formatNumber).join('-')
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : '0' + n
}

// 把所有的本地缓存都放在这里统一管理
// personid：当前用户存储在数据库Person中的_id
const savePersonID = value => {
  console.log("savePersonID:" + value)
  wx.setStorageSync("personid", value)
}

const loadPersonID = () => {
  var value = wx.getStorageSync("personid")
  console.log("loadPersonID:" + value)
  return value
}

const clearPersonID = () => {
  wx.removeStorageSync("personid")
  console.log("clearPersonID")
}

// openid：当前用户的唯一标识id,永远不变
const saveOpenID = value => {
  console.log("saveOpenID:" + value)
  wx.setStorageSync("openid", value)
}

const loadOpenID = () => {
  var value = wx.getStorageSync("openid")
  console.log("loadOpenID:" + value)
  return value
}

// outdoorid ：刚创建的活动信息,存储在数据库Outdoors中的_id
const saveOutdoorID = value => {
  console.log("saveOutdoorID:" + value)
  wx.setStorageSync("outdoorid", value)
}

const loadOutdoorID = () => {
  var value = wx.getStorageSync("outdoorid")
  console.log("loadOutdoorID:" + value)
  return value
}

const clearOutdoorID = () => {
  wx.removeStorageSync("outdoorid")
  console.log("clearOutdoorID")
}

// nickname ：当前用户的户外昵称，同Person表中的nickName，或微信昵称
const saveNicknameID = value => {
  console.log("saveNicknameID:" + value)
  wx.setStorageSync("nickname", value)
}

const loadNicknameID = () => {
  var value = wx.getStorageSync("nickname")
  console.log("loadNicknameID:" + value)
  return value
}

const clearNicknameID = () => {
  wx.removeStorageSync("nickname")
  console.log("clearNicknameID")
}

// 处理和微信gender中间的转化 GG/MM 对照：userInfo.gender //性别 0：未知、1：男、2：女
const toWxGender = (value) => { // 转为微信的gender
  if (value == "MM") {
    return 2
  } else if (value == "GG") {
    return 1
  } else {
    return 0
  }
}

const fromWxGender = (value) => { //从微信的gender得到GG/MM
  if (value == 1) {
    return "GG"
  } else if (value == 2) {
    return "MM"
  } else {
    return "保密"
  }
}

// 创建出 member的数据结构
const createMember = (personid, userInfo, entryInfo) => {
  var member = {
    personid: personid,
    userInfo: userInfo,
    entryInfo: entryInfo,
  };
  //member.time = new Date();// 自动记录时间
  //member.time = db.serverDate(); // 用服务端时间
  return member
}

// 用微信账号创建Person
const createPerson = (userInfo) => {
  var person = {
    nickName: userInfo.nickName,
    gender: userInfo.gender,
    phone: userInfo.phone,
  };
  return person
}

// 通过date得到星期几，如周一/.../六/日
const getDay = (date) => {
  var day = new Date(date).getDay();
  var text = "周";
  switch (day) {
    case 0:
      text += "日";
      break;
    case 1:
      text += "一";
      break;
    case 2:
      text += "二";
      break;
    case 3:
      text += "三";
      break;
    case 4:
      text += "四";
      break;
    case 5:
      text += "五";
      break;
    case 6:
      text += "六";
      break;
  }
  return text;
}

// 汉字转数字
const CChars = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '多']
const parseChar = (cchar) => {
  CChars.forEach((item, index) => {
    if (item == cchar) {
      return index
    }
  }) 
  return -1
}

// 得到截止日期数组
const getLimitDates = () => { 
  var LimitDates = ["不限", "前一天", "前两天", "前三天", "前四天", "前五天", "前六天"] // 截止日期
  return LimitDates;
}

// 根据字符信息，得到截止日期的索引 
const getLimitDateIndex = (date) => {
  var LimitDates = ["不限", "前一天", "前两天", "前三天", "前四天", "前五天", "前六天"] // 截止日期
  var result = 0
  LimitDates.forEach((item, index) => {
    if (item == date) {
      result = index
    }
  })
  return result
}

// 构建图片存储的路径
const buildPicSrc = (outdoorid, index) => { // index:0,1,2 图片顺序
  // 没有办法，只能先用时间（毫秒）作为随时文件名，等待微信解决bug
  return "Outdoors/" + outdoorid + "/" + new Date().getTime() + ".jpg"
}

// 构建轨迹文件存储的路径
const buildRouteSrc = (outdoorid, name) => { 
  return "Outdoors/" + outdoorid + "/Route/" + name
}

// 构建活动二维码图片存储的路径
const buildChatQrcode = (outdoorid) => { 
  // 没有办法，只能先用时间（毫秒）作为随时文件名，等待微信解决bug
  return "Outdoors/" + outdoorid + "/chat/qrcode" + new Date().getTime() + ".jpg"
}

// 构建收款二维码图片存储的路径
const buildPayQrcode = (outdoorid) => {
  // 没有办法，只能先用时间（毫秒）作为随时文件名，等待微信解决bug
  return "Outdoors/" + outdoorid + "/pay/qrcode" + new Date().getTime() + ".jpg"
}

const buildPayResult=(outdoorid, personid)=>{
  return "Outdoors/" + outdoorid + "/pay/" + personid + new Date().getTime() + ".jpg"
}

// 构建个人照片存储的路径
const buildPersonPhotoSrc = (personid, index) => { // index:0,1,2 图片顺序
  // 没有办法，只能先用时间（毫秒）作为随时文件名，等待微信解决bug
  return "Persons/" + personid + "/" + new Date().getTime() + ".jpg"
}

// 按照绿野习惯，发布出去的电话号码做谐音处理，防止网络爬虫获取隐私
// 第一步实现：0->O，1->I；其他如2->Z，5->S，8->B，9->q 再议
const changePhone = (phone) => {
  return phone.replace(/0/g, "O").replace(/1/g, "I") 
}

// 隐藏手机号码的中间三位
const hidePhone = (phone) => {
  return phone.substring(0, 3) + "***" + phone.substring(7)
}

// 从字符串中识别数字
const myParseInt = (str) => {
  var res = ""
  var temp = ""
  for (var i = 0; i < str.length; i++) {
    if (str.charAt(i) >= "0" && str.charAt(i) <= "9") {
      res += str.charAt(i)
    } else if (res.length > 0) { // 遇到中间不是数字，则需要清空
      temp = res
      res = ""
    }
  }
  return res ? parseInt(res) : parseInt(temp)
}

// 授权的统一函数
const authorize = (which, message, callback) => {
  var scope = 'scope.' + which
  console.log("scope is: " + scope)
  wx.getSetting({
    success(res) {
      console.log("wx.getSetting")
      if (!res.authSetting[scope]) { 
        wx.authorize({
          scope: scope,
          success() {
            console.log(scope + " OK")
            if (callback) {
              callback()
            }
          },
          fail() {
            wx.showModal({
              title: '必须授权',
              content: message,
              cancelText: "暂不授权",
              confirmText: "这就授权",
              success(res) {
                if (res.confirm) {
                  console.log('用户点击确定')
                  wx.openSetting({
                    success(res){
                      if (callback) {
                        callback()
                      }
                    }
                  })
                } else if (res.cancel) {
                  console.log('用户点击取消')
                }
              }
            })
          }
        })
      } else {
        if (callback) {
          callback()
        }
      }
    }
  })
}

// 得到唯一的户外昵称
const getUniqueNickname = (nickName, callback) => {
  dbPersons.where({ 
    "userInfo.nickName": nickName
  }).get().then(res => {
    console.log(res.data)
    if(res.data.length == 0){
      if(callback){
        callback(nickName)
      }
    } else if (res.data.length > 0) { // 有了就得换一个名字
      var time = (new Date()).getTime().toString() // 用时间毫秒数的最后四位做后缀
      nickName += time.substring(time.length-4)
      getUniqueNickname(nickName, callback)
    }
  })
}

// 拨打电话
const phoneCall = (phone, isEmergency)=>{
  if (phone.indexOf("*") != -1) {
    wx.showModal({
      title: '无法拨号',
      content: '队员无法给非领队成员拨号，请联系领队拨号',
      confirmText: "知道了",
      showCancel: false,
    })
  } else if (!phone || (!isEmergency && phone.length != 11))  {
    wx.showModal({
      title: '无法拨号',
      content: '号码不全，无法拨号',
      confirmText: "知道了",
      showCancel: false,
    })
  } else {
    wx.makePhoneCall({
      phoneNumber: phone
    })
  }
}

const stepsTopNs=(steps, tops)=>{
  var maxes=[]
  for(var i=0; i<tops.length; i++){
    maxes[i] = 0
  }

  var count = 0
  for(var i=steps.length; i>=0; i--) {
    for (var j = 0; j < maxes.length; j++) {
      if (steps[i] > maxes[j] && count < tops[j]) {
        maxes[j] = steps[i] 
      }
    }
    count++
  }
  return maxes
}

module.exports = {
  formatTime: formatTime,
  Ymd2Mdy: Ymd2Mdy,
  formatDate: formatDate,
  nextDate: nextDate,
  // openid
  saveOpenID: saveOpenID,
  loadOpenID: loadOpenID,
  //clearOpenID: clearOpenID
  // personid
  savePersonID: savePersonID,
  loadPersonID: loadPersonID,
  clearPersonID: clearPersonID,
  // outdoorid
  saveOutdoorID: saveOutdoorID,
  loadOutdoorID: loadOutdoorID,
  clearOutdoorID: clearOutdoorID,
  // nickname
  saveNicknameID: saveNicknameID,
  loadNicknameID: loadNicknameID,
  clearNicknameID: clearNicknameID,
  // 性别转化
  toWxGender: toWxGender,
  fromWxGender: fromWxGender,
  // 创造队员
  createMember: createMember,
  // 根据userInfo（非微信）创建Person
  createPerson: createPerson,
  getDay: getDay,
  parseChar: parseChar,
  // 图片在云存储上的位置
  buildPicSrc: buildPicSrc,
  buildRouteSrc: buildRouteSrc, // 轨迹文件在云上的存储位置

  buildChatQrcode: buildChatQrcode, // 活动专用群二维码
  buildPayQrcode: buildPayQrcode, // 收款二维码
  buildPayResult: buildPayResult, // 付款截屏
  buildPersonPhotoSrc: buildPersonPhotoSrc,
  // 截止日期数组和字符串的相互转化
  getLimitDates: getLimitDates,
  getLimitDateIndex: getLimitDateIndex,
  // 手机号码处理
  changePhone: changePhone,
  hidePhone: hidePhone,
  phoneCall: phoneCall,
  // 字符串转数字
  myParseInt: myParseInt,
  // 统一授权入口
  authorize: authorize,
  // 得到最近步数的top值
  stepsTopNs: stepsTopNs,
}