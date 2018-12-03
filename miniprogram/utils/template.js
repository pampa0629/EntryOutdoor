const util = require('./util.js')
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
    formids: [],
  }
  return wxnotice
}

const buildOneFormid = (formid) => {
  if (formid.indexOf("mock") == -1) { // 模拟的不要
    var expire = util.nextDate(new Date(), 7).getTime()
    return {
      "formid": formid,
      'expire': expire
    }
  } else {
    return null
  }
}

// 把获得的formid给指定人员存起来，还有过期时间
const savePersonFormid = (personid, formid, callback) => {
  console.log("savePersonFormid")
  var result = buildOneFormid(formid)
  if (result) {
    dbPersons.doc(personid).update({
      data: {
        formids: _.push(result)
      }
    }).then(res => {
      console.log("savePersonFormid OK: " + formid)
      if (callback) {
        callback()
      }
    })
  }
}

// 把获得的formid给指定人员存起来，还有过期时间
const saveOutdoorFormid = (outdoorid, formid) => {
  console.log(formid)
  var result = buildOneFormid(formid)
  if (result) { // 模拟的不要记录
    dbOutdoors.doc(outdoorid).update({
      data: {
        "limits.wxnotice.formids": _.push(result)
      }
    })
  }
}

const loadOutdoorFormids = (outdoorid, callback) => {
  dbOutdoors.doc(outdoorid).get().then(res => {
    if (callback && res.data.limits && res.data.limits.wxnotice) {
      console.log("loadOutdoorFormids OK")
      console.log(res.data.limits.wxnotice.formids)
      callback(res.data.limits.wxnotice.formids)
    }
  })
}

// 根据personid找到openid
const personid2openid = (personid, callback) => {
  dbPersons.doc(personid).get().then(res => {
    console.log(res)
    if (callback) {
      callback(res.data._openid)
    }
  })
}

// 发送活动取消的消息
const sendCancelMsg2Member = (personid, title, outdoorid, leader, reason) => {
  console.log("sendCancelMsg2Member")
  dbPersons.doc(personid).get().then(res => {
    var openid = res.data._openid
    var tempid = "yNh70qvwnC6iW6jwQ3OdY2w7aBfi3tstUdAGWwDiEdg"
    var data = { //下面的keyword*是设置的模板消息的关键词变量  
      "keyword1": { // 活动标题
        "value": title
      },
      "keyword2": { // 发起者
        "value": leader
      },
      "keyword3": { // 取消原因
        "value": reason
      },
    }
    var page = buildPage("EntryOutdoor", outdoorid)
    fetchPersonFormid(personid, res.data.formids, formid => {
      sendMessage(openid, tempid, formid, page, data)
    })
  })
}

const buildPage = (page, outdoorid) => {
  var result = "pages/" + page + "/" + page + "?outdoorid=" + outdoorid
  return result
}

// 给自己发报名消息
const sendEntryMsg2Self = (personid, title, phone, nickName, status, outdoorid, formid) => {
  console.log("sendEntryMsg2Self")
  dbPersons.doc(personid).get().then(res => {
    var openid = res.data._openid
    var tempid = "IL3BSL-coDIGoIcLwxj6OzC-F68qCMknJTNlk--tL2M"
    var data = { //下面的keyword*是设置的模板消息的关键词变量  
      "keyword1": { // 活动主题
        "value": title
      },
      "keyword2": { // 领队联系方式
        "value": phone
      },
      "keyword3": { // 自己的昵称
        "value": nickName
      },
      "keyword4": { // 报名状态
        "value": status
      }
    }
    var page = buildPage("EntryOutdoor", outdoorid)
    sendMessage(openid, tempid, formid, page, data)
    //fetchPersonFormid(personid, res.data.formids, formid=>{ })
  })
}

// 发送报名消息
const sendEntryMsg2Leader = (leaderid, userInfo, entryInfo, title, outdoorid) => {
  console.log("sendEntryMsg2Leader")
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
        "value": (entryInfo.knowWay ? "认路" : "不认路")
      },
      "keyword6": { // 集合地点
        "value": "第" + (entryInfo.meetsIndex + 1) + "集合地点"
      }
    }
    var page = buildPage("CreateOutdoor", outdoorid)
    fetchOutdoorFormid(outdoorid, formid => {
      sendMessage(openid, tempid, formid, page, data)
    })
  })
}

// 得到活动的form id
const fetchOutdoorFormid = (outdoorid, callback) => {
  // 得到formids
  loadOutdoorFormids(outdoorid, formids => {
    // 找到第一个能用的formid，把前面没用的删掉
    findFirstFormid(formids, result => {
      // 最后调用云函数写回去
      wx.cloud.callFunction({
        name: 'updateOutdoorFormids', // 云函数名称
        data: {
          outdoorid: outdoorid,
          formids: result.formids,
        },
      })
      if (callback) {
        callback(result.formid)
      }
    })
  })
}

// 找到第一个能用的formid，把前面没用的删掉（找到的也得删掉）
const findFirstFormid = (formids, callback) => {
  console.log("findFirstFormid")
  if (formids) {
    var formid = ""
    var hasFind = false
    var findIndex = -1
    console.log("before find, formids are: ")
    console.log(formids)
    formids.forEach((item, index) => {
      if (!hasFind && item.expire > (new Date()).getTime()) {
        formid = item.formid
        hasFind = true
        findIndex = index
        console.log("find formid, is: " + formid)
        formids.splice(0, findIndex + 1) // 前面的全部删除，包括找到的这个
        if (callback) {
          callback({
            "formid": formid,
            "formids": formids
          })
          return // 返回
        }
      } else if (!hasFind && index == formids.length - 1) { // 到最后仍然没找到
        formids = [] // 清空
        if (callback) {
          callback({
            "formid": "no find formid",
            "formids": []
          })
          return // 返回
        }
      }
    })
  }
}

// 得到某人的form id
const fetchPersonFormid = (personid, formids, callback) => {
  console.log("fetchPersonFormid")
  // 这里得调用云函数才行了，拿到第一个合格的formid，不合格的全部删掉 
  findFirstFormid(formids, result => {
    console.log("find result:")
    console.log(result)

    // 最后调用云函数写回去
    wx.cloud.callFunction({
      name: 'updatePersonFormids', // 云函数名称
      data: {
        personid: personid,
        formids: result.formids,
      },
    })
    if (callback) {
      callback(result.formid)
    }
  })
}

// 给特定openid发特定id的模板消息
const sendMessage = (openid, tempid, formid, page, data) => {
  console.log("sendMessage")
  console.log("openid: " + openid)
  console.log("tempid: " + tempid)
  console.log("formid: " + formid)
  console.log("page: " + page)
  console.log(data)
  if (formid) {
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
}

module.exports = {
  getDefaultNotice: getDefaultNotice,

  buildOneFormid: buildOneFormid,
  savePersonFormid: savePersonFormid,
  saveOutdoorFormid: saveOutdoorFormid,

  sendEntryMsg2Leader: sendEntryMsg2Leader, // 给领队发报名消息
  sendEntryMsg2Self: sendEntryMsg2Self, //  给自己发报名消息
  sendCancelMsg2Member: sendCancelMsg2Member, // 给队员发活动取消消息
}