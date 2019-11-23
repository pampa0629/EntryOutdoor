const app = getApp()
const util = require('./util.js')
const cloudfun = require('./cloudfun.js')
const promisify = require('./promisify.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbPersons = db.collection('Persons')

const getPersonData = async(personid) => {
  console.log("getPersonData()")
  console.log("personid:", personid)
  // return await dbPersons.doc(personid).get()
  try {
    return await dbPersons.doc(personid).get()
  } catch (e) {}
  // 
  //   console.log(personid+"不存在")
  //   console.log(e)
  //   return Error(e)
  // }
}

const updateWalkStep = async(personid) => {
  console.log("updateWalkStep()", personid)
  let resLogin = await promisify.login({})
  console.log("resLogin:", resLogin)

  await util.authorize("werun", "授权后才能获取步数")
  let res = await promisify.getWeRunData({})

  const encryptedData = res.encryptedData
  let run = await cloudfun.decrypt(res.encryptedData, res.iv, resLogin.code)
  console.log(run)
  var step = {}
  var date = new Date()
  date.setTime(run.watermark.timestamp * 1000)
  step.update = date.toLocaleDateString()
  var steps = []
  run.stepInfoList.forEach((item, index) => {
    steps.push(parseInt(item.step))
  })
  var tops = util.stepsTopNs(steps, [7, 30])
  step.topLast7 = tops[0]
  step.topLast30 = tops[1]
  dbPersons.doc(personid).update({
    data: {
      "career.step": step,
    }
  })
  return step
}

const getUniqueNickname = async(nickName, personid) => {
  if (nickName != null) {
    let res = await dbPersons.where({
      "userInfo.nickName": nickName
    }).get()
    console.log(res.data)
    // 如果数据库中没有这个名字，或者只有一个，且是自己，则返回
    if (res.data.length == 0 || (res.data.length == 1 && res.data[0]._id == personid)) {
      return nickName
    }
  }
  
  // 不然就随机取名
  var time = new Date().getTime().toString()
  var autoName = "驴友" + time.substr(-4)
  return getUniqueNickname(autoName)
}

// 是否包含特殊字符
const includeSpecialChar = (str) =>{
  var specials = "[`~!@#$^&*()=|{}':;',\\[\\].<>-—/?~！@#￥……&*（）——|{}【】‘；：”“'。，、？]"
  for(var i in str) {
    if (specials.indexOf(str[i]) >= 0) {
      return true
    }
  }
  return false
}

// 这里判断昵称的唯一性和不能为空
const checkNickname = async (nickName, personid) => {
  var nickErrMsg = ""
  if (!nickName) { 
    nickErrMsg = "昵称不能为空"
    return { msg: nickErrMsg, result: false }
  } else if (includeSpecialChar(nickName)) {
    nickErrMsg = "昵称不能包括汉字、数字和字母之外的特殊字符"
    return { msg: nickErrMsg, result: false }
  } else {
    let res = await dbPersons.where({
      "userInfo.nickName": nickName
    }).get()
    console.log(res.data)
    if (res.data.length > 1 || (res.data.length == 1 && res.data[0]._id != personid) ) {
      nickErrMsg = "昵称已被占用不能使用"
    }
    return { msg: nickErrMsg, result: nickErrMsg == "" }
  }
}

// 在Persons表中创建一条记录（个人账号）
const createRecord = async(userInfo, openid) => {
  console.log("person.createRecord()")
  // 最后仍然得判断openid真的在Persons表中没有，才创建新的
  let res = await dbPersons.where({
    _openid: openid,
  }).get()

  if (res.data.length == 0) { // 确认没有才加新的记录
    // 从微信登录信息中获取昵称和性别，不过不能与原有昵称重名
    let nickName = await getUniqueNickname(userInfo.nickName)
    userInfo.nickName = nickName
    // userInfo.gender = util.fromWxGender(e.detail.userInfo.gender);
    // 在Persons表中创建一条新用户的记录
    let res = await dbPersons.add({
      data: {
        userInfo: userInfo,
        myOutdoors: [],
        entriedOutdoors: [],
        caredOutdoors: [],
      }
    })
    return {
      personid: res._id,
      userInfo: userInfo
    }
  } else if (res.data.length == 1) { // 有的话，用读取的就好
    await cloudfun.opPersonItem(res.data[0]._id, "userInfo", userInfo, "")
    return{
        personid: res.data[0]._id,
        userInfo: userInfo
    }
  } else { // 已经有多个账号，后台处理
    wx.setClipboardData({
      data: openid,
      success: function(res) {
        wx.showModal({
          title: '检测到您有多个账号',
          content: '可能会导致后续问题，OpenID已经复制到内存中，请发给作者“攀爬”予以核实。',
          showCancel: false,
          confirmText: "马上就去",
        })
      }
    })
  }
}

const adjustGroup = (personid, groupOpenid) => {
  console.log("person.adjustGroup()", personid, groupOpenid)
  dbPersons.doc(personid).get().then(res => {
    var groups = res.data.groups ? res.data.groups : []
    groups.forEach((item, index) => {
      if (item.openid == groupOpenid) {
        groups.splice(index, 1)
      }
    })
    groups.unshift({
      openid: groupOpenid
    })
    // cloudfun.updatePersonGroups(personid, groups)
    cloudfun.opPersonItem(personid, "groups", groups, "")
  })
}

// 处理 Persons表中Outdoors内容
// key: 确定是myOutdoors、caredOutdoors、entriedOutdoors中的哪一个
// isQuit：是否为退出，还是添加
const dealOutdoors = async(personid, key, value, isQuit) => {
  console.log("person.dealOutdoors()")
  console.log(personid, key, value, isQuit)
  let res = await dbPersons.doc(personid).get()
  var outdoors = res.data[key]

  var index = -1
  do { // 循环保证清楚干净
    index = util.findIndex(outdoors, "id", value.id)
    if (index >= 0) {
      outdoors.splice(index, 1)
    }
  } while (index >= 0)

  if (!isQuit) {
    outdoors.unshift(value)
  }
  await cloudfun.opPersonItem(personid, key, outdoors, "")
  return outdoors
}

module.exports = {
  updateWalkStep: updateWalkStep, // 更新步数
  getUniqueNickname: getUniqueNickname, // 得到唯一的户外昵称（不重名）
  createRecord: createRecord, // 创建账号
  adjustGroup: adjustGroup, // 记录和调整加入的微信群的顺序
  checkNickname: checkNickname, //  判断昵称的唯一性和不能为空
  dealOutdoors: dealOutdoors, // 处理 Persons表中Outdoors内容

  getPersonData: getPersonData,
}