const util = require('./util.js')
const app = getApp()
wx.cloud.init()
const db = wx.cloud.database()
const dbPersons = db.collection('Persons')
const _ = db.command

// 把获得的formid存起来，还有过期时间
const saveFormid = (personid, formid) => {
  console.log(formid)
  var id = parseInt(formid)
  console.log(id)
  if (id) { // 模拟的不要记录
    var expire = util.nextDate(new Date(), 7).getTime()
    dbPersons.doc(personid).update({
      data: {
        formids: _.push({
          'formid': id,
          'expire': expire
        })
      }
    })
  }
}

// 根据personid找到openid
const personid2openid = (personid) => {
  dbPersons.doc(personid).get().then(res => {
    console.log(res)
    return res.data._openid
  })
}

// 发送报名消息
const sendEntryMessage = (leaderid, userInfo, entryInfo, title, outdoorid) => {
  console.log("sendEntryMessage")
  dbPersons.doc(leaderid).get().then(res => {
    var openid = res.data._openid
    var tempid = "4f4JAb6IwzCW3iElLANR0OxSoJhDKZNo8rvbubsfgyE"
    var data = { //下面的keyword*是设置的模板消息的关键词变量  
      "keyword1": { // 昵称
        "value": userInfo.nickName
      },
      "keyword2": { // 活动名称
        "value": title
      },
      "keyword3": { // 性别
        "value": userInfo.gender
      },
      "keyword4": { // 手机号码
        "value": userInfo.phone
      },
      "keyword5": { // 是否认路
        "value": entryInfo.knowWay
      },
      "keyword6": { // 集合地点
        "value": entryInfo.meetsIndex + 1
      }
    }
    var page = buildPage("CreateOutdoor", outdoorid)
    var formid = fetchFormid(leaderid, res.data.formids)
    sendMessage(openid, tempid, formid, page, data)
  })
}

const buildPage=(page, outdoorid)=>{
  var result = "pages/" + page + "/" + page + "?outdoorid="+outdoorid
  return result
}

// 得到某人的form id
const fetchFormid=(personid, formids)=>{
// 这里得调用云函数才行了，拿到第一个合格的formid，不合格的全部删掉 
  var formid = ""
  var hasFind = false
  var findIndex = -1
  formids.forEach((item, index)=>{
    if (!hasFind && item.expire>(new Date()).getTime()){
      formid = item.formid
      hasFind = true
      findIndex = index
    }
  })
  if(hasFind && findIndex>=0){
    console.log(findIndex)
    formids.splice(0, findIndex+1) // 前面的全部删除，包括找到的这个
  } else if(!hasFind){
    formids = [] // 清空
  }
  // 最后调用云函数写回去
  wx.cloud.callFunction({
    name: 'updateFormids', // 云函数名称
    data: {
      personid: personid,
      formids: formids,
    },
  })
  return formid
}

// 给特定openid发特定id的模板消息
const sendMessage = (openid, tempid, formid, page, data) => {
  console.log("sendMessage")
  console.log(openid)
  console.log(tempid)
  console.log(formid)
  console.log(page)
  console.log(data)
  wx.cloud.callFunction({
    name: 'getAccessToken', // 云函数名称
  }).then(res => {
    console.log(res)
    wx.cloud.callFunction({
      name: 'sendTemplate', // 云函数名称
      data: {
        openid: openid,
        access_token: JSON.parse(res.result).access_token,
        tempid: tempid,
        formid: formid,
        data: data,
        page: page,
      },
    }).then(res => {
      console.log(res)
    })
  })
}

module.exports = {
  saveFormid: saveFormid,
  sendEntryMessage: sendEntryMessage, 
}