const util = require('./util.js')
const cloudfun = require('./cloudfun.js')

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
        callback(result)
      }
    }).catch(err=>{
      console.log(err)
    })
  }
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

// 给订阅者发“新活动”消息 
const sendCreateMsg2Subscriber = (personid, title, outdoorid, phone, callback) => {
  console.log("sendCreateMsg2Subscriber")
  dbPersons.doc(personid).get()
  .then(res => {
    var openid = res.data._openid
    var tempid = "TpeH_K6s2zQSk49oJT3koMSlaSXQIoZjatxB4Wd_dBE"
    var data = { //下面的keyword*是设置的模板消息的关键词变量  
      "keyword1": { // 内容
        "value": title
      },
      "keyword2": { // 备注
        "value": "由于微信限制，不得已用此标题，见谅！"
      },
      "keyword3": { // 联系电话
        "value": phone
      },
    } 
    var page = buildPage("EntryOutdoor", outdoorid)
    fetchPersonFormid(personid, res.data.formids, formid => {
      sendMessage(openid, tempid, formid, page, data, res=>{
        if (callback) {
          callback(res)
        }
      })
    })
  }).catch(err=>{
    console.log(err)
    if (callback) {
      callback(err)
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

// 给全体队员发送活动重要内容修改通知
const sendModifyMsg2Member = (personid, outdoorid, title, leader, modifys) => {
  console.log("sendModifyMsg2Member") 
  var info = "您报名的户外活动"
  var tip = ""
  console.log(modifys)
  if (modifys.title) {
    info += "基本信息被修改为：“" + title + "”，"
    tip += "本次修改涉及活动重大内容修改，请点击进入小程序查看修改后的内容，若不能确保自己仍然能参加活动，请及时退出活动！"
  }
  if (modifys.meets) {
    info += "集合地点信息被修改，"
    tip += "请点击进入小程序查看被修改后的集合地点，并选择自己适合的地点集合。"
  }
  info += "敬请留意！"

  dbPersons.doc(personid).get().then(res => {
    var openid = res.data._openid
    var tempid = "HrOjxx70qtkyerdup5zISeydonsvpH_f_vjLe2LwkIc"
    var data = { //下面的keyword*是设置的模板消息的关键词变量  
      "keyword1": { // 活动名称
        "value": title
      },
      "keyword2": { // 修改详情
        "value": info
      },
      "keyword3": { // 修改者
        "value": leader
      },
      "keyword4": { // 温馨提示
        "value": tip
      },
    }
    var page = buildPage("EntryOutdoor", outdoorid)
    fetchPersonFormid(personid, res.data.formids, formid => {
      sendMessage(openid, tempid, formid, page, data)
    })
  })
}

// 给所有队员发活动成行通知
const sendConfirmMsg2Member = (personid, outdoorid, title, count, leader) => {
  console.log("sendConfirmMsg2Member")
  dbPersons.doc(personid).get().then(res => {
    var openid = res.data._openid
    var tempid = "Eh_ODLoKykVkGGjJPLEmKjLs9xJXv5NyGKF-cyVwyBc"
    var data = { //下面的keyword*是设置的模板消息的关键词变量  
      "keyword1": { // 活动名称
        "value": title
      },
      "keyword2": { // 报名人数
        "value": count
      },
      "keyword3": { // 发起人
        "value": leader
      },
    }
    var page = buildPage("EntryOutdoor", outdoorid)
    fetchPersonFormid(personid, res.data.formids, formid => {
      sendMessage(openid, tempid, formid, page, data)
    })
  })
}

// 给队员发换领队的消息
const sendResetMsg2Member=(outdoorid, personid, title, oldLeader, newLeader)=>{
  console.log("sendResetMsg2Member") 
  dbPersons.doc(personid).get().then(res => {
    var openid = res.data._openid
    var tempid = "gE0pItk53ho16bMoJdjuuPPua-Ev2THvtiVe8KksEMU"
    var data = { //下面的keyword*是设置的模板消息的关键词变量  
      "keyword1": { // 项目名称
        "value": title
      },
      "keyword2": { // 转单人员
        "value": oldLeader
      },
      "keyword3": { //接单人员
        "value": newLeader
      },
    }
    var page = buildPage("EntryOutdoor", outdoorid)
    fetchPersonFormid(personid, res.data.formids, formid => {
      sendMessage(openid, tempid, formid, page, data)
    })
  })
}

const sendPayMsg2Member=(outdoorid, personid, title, cfo, money, member)=>{
  console.log("sendResetMsg2Member")
  dbPersons.doc(personid).get().then(res => {
    var openid = res.data._openid
    var tempid = "sAE5UXzlJVVNPnCGG4C-nM9YnpSSz5WkH2d1XW2dq5Y"
    var data = { //下面的keyword*是设置的模板消息的关键词变量  
      "keyword1": { // 收款项目
        "value": title
      },
      "keyword2": { // 收款方
        "value": cfo
      },
      "keyword3": { //收款金额
        "value": money
      },
      "keyword4": { //付款人
        "value": member
      },
      "keyword5": { //备注
        "value": "收款方（财务官）即作为活动AA收款执行者，不构成经营行为。请点击进入小程序页面，下载收款二维码进行微信支付。"
      },
    }
    var page = buildPage2("AboutOutdoor", "PayOutdoor", outdoorid)
    fetchPersonFormid(personid, res.data.formids, formid => {
      sendMessage(openid, tempid, formid, page, data)
    })
  })
}

const buildPage = (page, outdoorid) => {
  var result = "pages/" + page + "/" + page + "?outdoorid=" + outdoorid
  return result
}

const buildPage2 = (page1, page2, outdoorid, items) => {
  var result = "pages/" + page1 + "/" + page2 + "?outdoorid=" + outdoorid
  items = items ? items:[]
  for (var i in items) {
    result += "&" + items[i].key + "=" + items[i].value
  }
  return result
}

// 给自己发报名消息
const sendEntryMsg2Self = (personid, title, phone, nickName, status, outdoorid) => {
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
    fetchPersonFormid(personid, res.data.formids, formid => {
      sendMessage(openid, tempid, formid, page, data)
    })
  })
}

// 发送报名消息
const sendEntryMsg2Leader = (leaderid, userInfo, entryInfo, title, outdoorid) => {
  console.log("sendEntryMsg2Leader")
  console.log(leaderid)
  dbPersons.doc(leaderid).get().then(res => {
    var openid = res.data._openid
    console.log(openid)
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
    fetchPersonFormid(leaderid, res.data.formids, formid => {
      sendMessage(openid, tempid, formid, page, data)
    })
  })
}

const sendAppointMsg2CFO=(personid, outdoorid, title, nickName)=>{
  console.log("sendAppointMsg2CFO")
  dbPersons.doc(personid).get().then(res => {
    var openid = res.data._openid
    var tempid = "VOM-G6WNZpfQldLmrw-Q_PJEZmqPE-f-5nNEf6_4PyQ"
    var data = { //下面的keyword*是设置的模板消息的关键词变量  
      "keyword1": { // 所在单位-->活动信息
        "value": title
      },
      "keyword2": { // 授权者-->自己
        "value": nickName
      },
      "keyword3": { // 备注：点击进入页面
        "value": "您已被领队授权为财务官（CFO），请点击进入小程序收付款页面履行职务。"
      },
    }
    var page = buildPage2("AboutOutdoor", "PayOutdoor", outdoorid)
    fetchPersonFormid(personid, res.data.formids, formid => {
      console.log(formid)
      sendMessage(openid, tempid, formid, page, data)
    })
  })
}
 
// 给报名者发消息，询问情况
const sendChatMsg2Member = (personid, title, outdoorid, nickName, phone, content) => {
  console.log("sendChatMsg2Member")
  dbPersons.doc(personid).get().then(res => {
    var openid = res.data._openid
    var tempid = "n97BC6ch3RGsOgmmJeDIvi1Auo830o1A-qr44ZZeg68"
    var data = { //下面的keyword*是设置的模板消息的关键词变量  
      "keyword1": { // 留言项目
        "value": title
      },
      "keyword2": { // 留言内容
        "value": content
      },
      "keyword3": { // 留言人
        "value": nickName
      },
      "keyword4": { // 电话
        "value": phone
      }
    } 
    var page = buildPage2("AboutOutdoor", "ChatOutdoor", outdoorid, [{key:"sendWxnotice",value:"true"},{key:"nickName",value:nickName}] )

    fetchPersonFormid(personid, res.data.formids, formid => {
      console.log(formid)
      sendMessage(openid, tempid, formid, page, data)
    })
  })
}

// 给报名被驳回者发消息
const sendRejectMsg2Member = (personid, title, outdoorid, nickName, phone, content) => {
  console.log("sendRejectMsg2Member")
  dbPersons.doc(personid).get().then(res => {
    var openid = res.data._openid
    var tempid = "IXScAdQZb_QmXCHXWCpjXwjwqii9_yOILJtCiGg1al0"
    var data = { //下面的keyword*是设置的模板消息的关键词变量  
      "keyword1": { // 活动名称
        "value": title
      },
      "keyword2": { // 未通过原因
        "value": content
      },
      "keyword3": { // 审核人
        "value": nickName
      },
      "keyword4": { // 联系电话
        "value": phone
      }
    }
    //var page = buildPage("EntryOutdoor", outdoorid)
    var page = buildPage2("AboutOutdoor", "ChatOutdoor", outdoorid, [{ key: "sendWxnotice", value: "true" }])

    fetchPersonFormid(personid, res.data.formids, formid => {
      console.log(formid)
      sendMessage(openid, tempid, formid, page, data)
    })
  })
}

// 清理过期的formids，回调返回可用的formids
const clearPersonFormids = (personid, callback) => {
  dbPersons.doc(personid).get().then(res => {
    var oldCount = res.data.formids
    var resFormids = findFirstFormid(res.data.formids, false)
    if (oldCount > resFormids.formids.length) {
      cloudfun.updatePersonFormids(personid, resFormids.formids)
    }
    if (callback) {
      callback(resFormids.formids)
    }
  })
}

// 找到第一个能用的formid， 把前面没用的删掉
// isDelFind： 是否删除找到的id
const findFirstFormid = (formids, isDelFind) => {
  console.log("findFirstFormid")

  var formid = null
  if (formids) {
    console.log("before find, formids are: ")
    console.log(formids)
    for(var i in formids) {
      if (formids[i].expire > (new Date()).getTime()) {
        formid = formids[i].formid
        console.log("find formid, is: " + formid)
        var delCount = isDelFind ? (i + 1) : i
        formids.splice(0, delCount)
        break 
      }
    }
  }

  if (!formid) { // 没找到，则返回空
    formids = [] // 清空
  }
  return { formid: formid, formids: formids}
}

// 得到某人的form id
const fetchPersonFormid = (personid, formids, callback) => {
  console.log("fetchPersonFormid")
  var formid = null 
  // 这里得调用云函数才行了，拿到第一个合格的formid，不合格的全部删掉 
  if (formids && formids.length>0) {
    var result = findFirstFormid(formids, true)
    formid = result.formid
    console.log("find result:")
    console.log(result)
    // 最后调用云函数写回去
    cloudfun.updatePersonFormids(personid, result.formids)
  }

  if (callback) {
    callback(formid)
  }
 }

// 给自己发报名退出消息
const sendQuitMsg2Self = (personid, outdoorid, title, date, leader, nickName, remark) => {
  console.log("sendQuitMsg2Self")
  dbPersons.doc(personid).get().then(res => {
    var openid = res.data._openid
    var tempid = "mHbrqjd8FBpkM_hZgkcuEj0TDDxuiV-dT160jhK1tNw"
    var data = { //下面的keyword*是设置的模板消息的关键词变量  
      "keyword1": { // 活动主题
        "value": title
      },
      "keyword2": { // 活动时间
        "value": date
      },
      "keyword3": { // 领队
        "value": leader
      },
      "keyword4": { // 备注
        "value": remark
      },
      "keyword5": { // 登录账号
        "value": nickName
      },
    }
    var page = buildPage("EntryOutdoor", outdoorid)
    fetchPersonFormid(personid, res.data.formids, formid => {
      sendMessage(openid, tempid, formid, page, data)
    })
  })
}

// 给被强制退坑者发模板消息
const sendQuitMsg2Occupy = (personid, outdoorid, title, date, leader, nickName) => {
  console.log("sendQuitMsg2Occupy")
  var remark = "您所占坑的活动由于占坑截止时间已过，您已被强制退出；若有意参加此次活动，请尽快点击进入小程序重新报名。"
  sendQuitMsg2Self(personid, outdoorid, title, date, leader, nickName, remark) // 复用
}

// 替补队员转为正式队员时，发消息提醒
const sendEntryMsg2Bench = (personid, outdoorid, title, nickName) => {
  console.log("sendEntryMsg2Bench")
  var statusChange = "从替补中转为报名中"
  var remark= "前面队员退出或领队扩编，您已经转为正式队员；若不能参加，请及时退出活动"
  sendStatusChangeMsg2Member(personid, outdoorid, title, nickName, statusChange, remark)
}

// 正式队员转为替补队员时，发消息提醒
const sendBenchMsg2Member = (personid, outdoorid, title, oldStatus, nickName) => {
  console.log("sendBenchMsg2Member")
  var statusChange = "从"+oldStatus+"转为替补中"
  var remark = "由于领队降低队伍的最大人数（缩编），您报名靠后，报名状态被改为“替补中”。您可点击进入小程序查看详情。"
  sendStatusChangeMsg2Member(personid, outdoorid, title, nickName, statusChange, remark)
}

// 替补队员转为正式队员时，发消息提醒
const sendStatusChangeMsg2Member = (personid, outdoorid, title, nickName, statusChange, remark) => {
  console.log("sendStatusChangeMsg2Member")
  dbPersons.doc(personid).get().then(res => {
    var openid = res.data._openid
    var tempid = "Cbw4Bpfa97gmQWOxTKHWrhOqtFYDj30gM5lE1SvawWY"
    var data = { //下面的keyword*是设置的模板消息的关键词变量  
      "keyword1": { // 活动主题
        "value": title
      },
      "keyword2": { // 报名人
        "value": nickName
      },
      "keyword3": { // 报名状态
        "value": statusChange
      },
      "keyword4": { // 备注
        "value": remark
      },

    }
    var page = buildPage("EntryOutdoor", outdoorid)
    fetchPersonFormid(personid, res.data.formids, formid => {
      sendMessage(openid, tempid, formid, page, data)
    })
  })
}

// 给特定openid发特定id的模板消息
const sendMessage = (openid, tempid, formid, page, data, callback) => {
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
        if (callback) {
          callback(res)
        }
      }).catch(err=>{
        if (callback) {
          callback(err)
        }
      })
    })
  } else if (callback) {
    callback()
  }
}

module.exports = {
  getDefaultNotice: getDefaultNotice,

  buildOneFormid: buildOneFormid,
  savePersonFormid: savePersonFormid,
  // saveOutdoorFormid: saveOutdoorFormid, 废弃，存到Persons表中
  clearPersonFormids: clearPersonFormids, // 清理并得到有效的个人formids

  sendMessage: sendMessage, // 发送模板消息

  // 给队员发消息
  sendCreateMsg2Subscriber: sendCreateMsg2Subscriber, // 给订阅者发“新活动”消息
  sendEntryMsg2Self: sendEntryMsg2Self, //  给自己发报名消息
  sendQuitMsg2Self: sendQuitMsg2Self, // 给自己发报名退出消息
  sendEntryMsg2Bench: sendEntryMsg2Bench, // 给替补队员发转为正式队员的消息
  sendBenchMsg2Member: sendBenchMsg2Member, // 给队员(报名/占坑)发转为替补队员的消息，用于领队缩编时
  sendQuitMsg2Occupy: sendQuitMsg2Occupy, // 给被强制退坑者发消息提醒
  sendChatMsg2Member: sendChatMsg2Member, // 给队员发留言消息，询问个人情况
  sendRejectMsg2Member: sendRejectMsg2Member, // 给报名被驳回的队员发消息
  sendModifyMsg2Member: sendModifyMsg2Member, // // 给队员发送活动重要内容修改通知
  sendCancelMsg2Member: sendCancelMsg2Member, // 给队员发活动取消消息
  sendConfirmMsg2Member: sendConfirmMsg2Member, // 给队员发活动成行消息
  sendResetMsg2Member: sendResetMsg2Member, // 给队员发换领队的消息
  sendPayMsg2Member: sendPayMsg2Member, // 给队员发收款的消息

  // 给领队/领队组/财务官等发消息
  sendEntryMsg2Leader: sendEntryMsg2Leader, // 给领队发报名消息
  sendAppointMsg2CFO: sendAppointMsg2CFO, // 给cfo发当选消息
}