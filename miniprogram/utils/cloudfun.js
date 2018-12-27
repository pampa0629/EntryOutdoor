const util = require('./util.js')
const app = getApp()
wx.cloud.init()
const db = wx.cloud.database()
const dbPersons = db.collection('Persons')
const dbOutdoors = db.collection('Outdoors')
const _ = db.command
 
// 更新Outdoors表中，chat.seen.personid的值
const updateOutdoorChatSeen = (outdoorid, personid, count) => {
  console.log("updateOutdoorChatSeen")
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: {
      table: "Outdoors",
      id: outdoorid,
      item: "chat.seen." + personid,
      command: "",
      value: count
    }
  })
}

// 在Outdoors表的chat.messages中，追加一条留言
const pushOutdoorChatMsg = (outdoorid, message)=>{
  console.log("pushOutdoorChatMsg")
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: {
      table: "Outdoors",
      id: outdoorid,
      item: "chat.messages",
      command: "push",
      value: message
    }
  })
}

// 一次性刷新Outdoors表中对应id记录中，所有的成员信息
const updateOutdoorMembers = (outdoorid, members, callback)=>{
  console.log("updateOutdoorMembers")
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: {
      table: "Outdoors",
      id: outdoorid,
      item: "members",
      command: "",
      value: members
    }
  }).then(res=>{
    if (callback) {
      callback(res)
    }
  })
}

const pushOutdoorMember=(outdoorid, member, callback)=>{
  console.log("pushOutdoorMember")
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: {
      table: "Outdoors",
      id: outdoorid,
      item: "members",
      command: "push",
      value: member
    }
  }).then(res=>{
    if(callback) {
      callback(res)
    }
  })
}

const addOutdoorNoticeCount=(outdoorid, count)=>{
  console.log("addOutdoorNoticeCount")
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: {
      table: "Outdoors",
      id: outdoorid,
      item: "limits.wxnotice.alreadyCount",
      command: "inc",
      value: count
    }
  })
}

const pushOutdoorLvyeWaiting=(outdoorid, message)=>{
  console.log("pushOutdoorLvyeWaiting")
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: {
      table: "Outdoors",
      id: outdoorid,
      item: "websites.lvyeorg.waitings",
      command: "push",
      value: message
    }
  })
}

const shiftOutdoorLvyeWaitings=(outdoorid, callback)=>{
  console.log("shiftOutdoorWaitings")
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: {
      table: "Outdoors",
      id: outdoorid,
      item: "websites.lvyeorg.waitings",
      command: "shift",
      value: null,
    }
  }).then(res=>{
    if(callback) {
      callback(res)
    }
  })
}

const updateOutdoorFormids=(outdoorid, formids)=>{
  console.log("updateOutdoorFormids")
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: {
      table: "Outdoors",
      id: outdoorid,
      item: "limits.wxnotice.formids",
      command: "",
      value: formids,
    }
  })
}


////===========  Persons ===========/////
// 在Persons表的 caredOutdoors, 最前面追加一条户外活动信息
const unshiftPersonCared = (personid, outdoorid, title)=>{
  console.log("unshiftPersonCared")
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: {
      table: "Persons",
      id: personid,
      item: "caredOutdoors",
      command: "unshift",
      value: { id: outdoorid, title: title }
    }
  })
}

const updatePersonFormids=(personid, formids)=>{
  console.log("updatePersonFormids")
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: {
      table: "Persons",
      id: personid,
      item: "formids",
      command: "",
      value: formids
    }
  })
}

const updatePersonSubscriber=(leaderid, personid, mine)=>{
  console.log("updatePersonSubscriber")
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: { // 
      table: "Persons",
      id: leaderid,
      item: "subscribers." + personid,
      command: "",
      value: mine
    }
  })
}

const decryptWeRun=(encrypedData, iv, code, callback)=>{
  console.log("decryptWeRun")
  wx.cloud.callFunction({
    name: 'decryptWeRun', // 云函数名称
    data: { // 
      encrypedData: encrypedData,
      iv: iv,
      code:code,
    }
  }).then(res=>{
    console.log(res)
    if(callback){
      callback(res.result)
    }
  })
}

module.exports = {
  // Outdoors
  updateOutdoorChatSeen: updateOutdoorChatSeen,
  pushOutdoorChatMsg: pushOutdoorChatMsg,

  updateOutdoorMembers: updateOutdoorMembers,
  pushOutdoorMember: pushOutdoorMember,
  
  addOutdoorNoticeCount: addOutdoorNoticeCount,

  pushOutdoorLvyeWaiting: pushOutdoorLvyeWaiting,
  shiftOutdoorLvyeWaitings: shiftOutdoorLvyeWaitings,

  updateOutdoorFormids: updateOutdoorFormids,

  // Persons
  unshiftPersonCared:unshiftPersonCared,
  updatePersonFormids: updatePersonFormids,
  updatePersonSubscriber: updatePersonSubscriber,

  // other 
  decryptWeRun: decryptWeRun, 
}