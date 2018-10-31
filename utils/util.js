//console.log(".js in  fun, e is:" + JSON.stringify(e, null, 2))
//console.log(".js in  fun, e is:" + e)

const app = getApp()
wx.cloud.init()
const db = wx.cloud.database()

const formatTime = date => {
  const year = date.getFullYear() 
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':')
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
/* 应该不会这个需要，先注释掉
const clearOpenID = () => {
  wx.removeStorageSync("openid")
  console.log("clearOpenID")
}*/


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
const getDay=(date) =>{
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

// 构建图片存储的路径
const buildPicSrc = (outdoorid, index) => { // index:0,1,2 图片顺序
  // 没有办法，只能先用时间（毫秒）作为随时文件名，等待微信解决bug
  return "Outdoors/" + outdoorid + "/" + new Date().getTime() + ".jpg"
}

module.exports = {
  formatTime: formatTime,
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
  // 图片在云存储上的位置
  buildPicSrc: buildPicSrc,
 }