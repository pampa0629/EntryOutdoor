const util = require('./util.js')
const cloudfun = require('./cloudfun.js')
// const regeneratorRuntime = require('regenerator-runtime')

const app = getApp()
wx.cloud.init()
const db = wx.cloud.database()
const dbPersons = db.collection('Persons')
const dbOutdoors = db.collection('Outdoors')
const _ = db.command

// 得到默认的消息通知
const getDefaultNotice = () => {
  var wxnotice = {
    accept: true, // 是否接收
    entryCount: 3, // 接收前几个队员的报名消息
    alreadyCount: 0, // 已经接收了几个
    fullNotice: true, // 报名满了，是否接收消息（以便好截止报名）
  }
  return wxnotice
}

// 给订阅者发“新活动”消息
const sendCreateMsg = async(personid, outdoorid, title, leader, date, place, count) => {
  console.log("message.sendCreateMsg()", personid, outdoorid, title, leader, date, place, count)
  try {
    const res = await dbPersons.doc(personid).get()
    var openid = res.data._openid
    var tempid = "EX-4r4qcQrxj1XkO1uhGAUA-fDnwjn6QnLB4pHWszNs"
    var data = { //下面的keyword*是设置的模板消息的关键词变量  
      "thing6": { // 活动名称 {{ thing6.DATA }  }
        "value": title.substring(0, 20)
      },
      "thing1": { // 发起方  { { thing1.DATA } }
        "value": leader.substring(0, 20)
      },
      "date2": { // 开始时间  { { date2.DATA } }
        "value": date
      },
      "thing4": { // 活动地点  { { thing4.DATA } }
        "value": place.substring(0, 20)
      },
      "number5": { // 名额限制  { { number5.DATA } }
        "value": count
      },
    }
    var page = buildDefaultPage(outdoorid, personid)
    return await sendMessage(openid, tempid, page, data)
  } catch (err) {
    console.error(err)
  }
}

// 活动状态变更通知（活动成行/取消）
const sendOdStatusChange = async(personid, outdoorid, title, status, remark) => {
  console.log("message.sendOdStatusChange()", personid, outdoorid, title, status, remark)
  try {
    const res = await dbPersons.doc(personid).get()
    var openid = res.data._openid
    var tempid = "Sj8TATwvmR-qZwUoUifcjOVUr1hpFk0CcXgOAPHGhww"
    var data = { //下面的keyword*是设置的模板消息的关键词变量  
      "thing1": { // 订单内容，活动标题
        "value": title.substring(0, 20)
      },
      "phrase2": { // 订单状态  { { phrase2.DATA } }
        "value": status.substring(0, 5)
      },
      "thing5": { // 备注    { { thing5.DATA } }
        "value": remark.substring(0, 20)
      }
    }
    var page = buildDefaultPage(outdoorid, personid)
    return await sendMessage(openid, tempid, page, data)
  } catch (err) {
    console.error(err)
  }
}

// 报名状态变更通知（被领队驳回/自行退出/缩编时报名变替补/强制退坑/替补转正等）
const sendEntryStatusChange = async(personid, outdoorid, title, msg) => {
  console.log("message.sendEntryStatusChange()", personid, outdoorid, title, msg)
  try {
    const res = await dbPersons.doc(personid).get()
    var openid = res.data._openid
    var tempid = "Sj8TATwvmR-qZwUoUifcjOVUr1hpFk0CcXgOAPHGhww"
    var data = { //下面的keyword*是设置的模板消息的关键词变量  
      "thing1": { // 活动主题    { { thing1.DATA } }
        "value": title.substring(0, 20)
      },
      "thing4": { // 最新进展    { { thing4.DATA } }
        "value": msg.substring(0, 20)
      }
    }
    var page = buildDefaultPage(outdoorid, personid)
    return await sendMessage(openid, tempid, page, data)
  } catch (err) {
    console.error(err)
  }
}

// 活动重要提醒通知（活动基本信息被修改/换领队/有照片上传/领队留言等）
const sendOdInfoChange = async(personid, outdoorid, title, msg) => {
  console.log("message.sendOdInfoChange()", personid, outdoorid, title, msg)
  try {
    const res = await dbPersons.doc(personid).get()
    var openid = res.data._openid
    var tempid = "1O-Y8wh7U7iNa_g3LmKiAJ7wHXUUwZdcNdOcCcYSEHY"
    var data = { //下面的keyword*是设置的模板消息的关键词变量  
      "thing2": { // 活动名称    { { thing2.DATA } }
        "value": title.substring(0, 20)
      },
      "thing6": { // 修改详情    { { thing6.DATA } }
        "value": msg.substring(0, 20)
      }
    }
    var page = buildDefaultPage(outdoorid, personid)
    return await sendMessage(openid, tempid, page, data)
  } catch (err) {
    console.error(err)
  }
}

// 队员报名消息 
const sendEntryMsg = async(personid, outdoorid, title, nickName, time, remark) => {
  console.log("message.sendEntryFull()", personid, outdoorid, title, remark)
  try {
    const res = await dbPersons.doc(personid).get()
    var openid = res.data._openid
    var tempid = "1u0TixqNPN-E4yzzaK8LrUooofZAgGoK3_EwrrIG_Lg"
    var data = { //下面的keyword*是设置的模板消息的关键词变量  
      "thing1": { // 订单名称 {{ thing1.DATA }  }
        "value": title.substring(0, 20)
      },
      "name2": { // 报名人  { { name2.DATA } }
        "value": nickName.substring(0, 10)
      },
      "date4": { // 报名时间  { { date4.DATA } }
        "value": time
      },
      "thing3": { // 报名备注  { { thing3.DATA } }
        "value": remark.substring(0, 20)
      }
    }
    var page = buildDefaultPage(outdoorid, personid)
    return await sendMessage(openid, tempid, page, data)
  } catch (err) {
    console.error(err)
  }
}

// 报名满员通知
const sendEntryFull = async(personid, outdoorid, title, remark) => {
  console.log("message.sendEntryFull()", personid, outdoorid, title, remark)
  try {
    const res = await dbPersons.doc(personid).get()
    var openid = res.data._openid
    var tempid = "td1vrF82SwI0e730B2bGL-k3fkYZXwmFQEPhssNU50c"
    var data = { //下面的keyword*是设置的模板消息的关键词变量  
      "thing1": { // 活动名称 {{ thing1.DATA }  }
        "value": title.substring(0, 20)
      },
      "thing5": { // 备注  { { thing5.DATA } }
        "value": remark.substring(0, 20)
      }
    }
    var page = buildDefaultPage(outdoorid, personid)
    return await sendMessage(openid, tempid, page, data)
  } catch (err) {
    console.error(err)
  }
}


// 构建页面路径
const buildDefaultPage = (outdoorid, personid, leaderid) => {
  console.log("template.buildDefaultPage()", outdoorid, personid, leaderid)
  console.log("app.globalData.personid", app.globalData.personid)
  // 给了领队id，就用；没给，就用发起者作为领队
  leaderid = leaderid ? leaderid : app.globalData.personid
  if (personid == leaderid) {
    return "pages/CreateOutdoor/CreateOutdoor?outdoorid=" + outdoorid
  } else {
    return "pages/EntryOutdoor/EntryOutdoor?outdoorid=" + outdoorid
  }
}

const buildPage = (page, outdoorid) => {
  var result = "pages/" + page + "/" + page + "?outdoorid=" + outdoorid
  return result
}

const buildPage2 = (page1, page2, outdoorid, items) => {
  var result = "pages/" + page1 + "/" + page2 + "?outdoorid=" + outdoorid
  items = items ? items : []
  for (var i in items) {
    result += "&" + items[i].key + "=" + items[i].value
  }
  return result
}

// 给特定openid发特定id的模板消息
const sendMessage = async(openid, tempid, page, data) => {
  console.log("message.sendMessage()", openid, tempid, page, data)
  const res = await wx.cloud.callFunction({
    name: 'sendMessage', // 云函数名称
    data: {
      openid: openid,
      tempid: tempid,
      data: data,
      page: page,
    },
  })
  console.log("res:", res)
  return res
}

module.exports = {
  getDefaultNotice: getDefaultNotice,

  // sendMessage: sendMessage, // 发送模板消息，内部函数不对外

  // 系统给队员发新活动消息；多人群发，注意控制并发数量不超过20
  sendCreateMsg: sendCreateMsg, // 给订阅者发“新活动”消息

  // 领队发给队员关于本次活动的消息
  sendOdStatusChange: sendOdStatusChange, // 活动状态变更通知（活动成行/取消）
  sendEntryStatusChange: sendEntryStatusChange, // 报名状态变更通知（被领队驳回/自行退出/缩编时报名变替补/强制退坑/替补转正等）
  sendOdInfoChange: sendOdInfoChange, // 活动重要提醒通知（活动基本信息被修改/换领队/有照片上传/领队留言等）

  // 队员给领队发报名消息
  sendEntryMsg: sendEntryMsg, // 队员报名消息 1u0TixqNPN-E4yzzaK8LrUooofZAgGoK3_EwrrIG_Lg
  sendEntryFull: sendEntryFull, // 报名满员通知

}