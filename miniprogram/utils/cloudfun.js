const util = require('./util.js')
const app = getApp()
wx.cloud.init()
const db = wx.cloud.database()
const dbPersons = db.collection('Persons')
const dbOutdoors = db.collection('Outdoors')
const _ = db.command
  
const updateOutdoor=(outdoorid, data, callback)=>{
  console.log("updateOutdoor")
  wx.cloud.callFunction({
    name: 'updateOutdoor', // 云函数名
    data: {
      outdoorid: outdoorid,
      data: data
    }
  }).then(res=>{
    if(callback) {
      callback(res)
    }
  })
}

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

// 更新在Outdoors表的chat
const updateOutdoorChat = (outdoorid, chat) => {
  console.log("updateOutdoorChat")
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: {
      table: "Outdoors",
      id: outdoorid,
      item: "chat",
      command: "",
      value: chat
    }
  })
}

// 更新在Outdoors表的chat中的qrcode
const updateOutdoorChatQrcode = (outdoorid, qrcode) => {
  console.log("updateOutdoorChatQrcode")
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: {
      table: "Outdoors",
      id: outdoorid,
      item: "chat.qrcode",
      command: "",
      value: qrcode
    }
  })
}

const updateOutdoorAddMembers = (outdoorid, addMembers, callback) => {
  console.log("updateOutdoorAddMembers")
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: {
      table: "Outdoors",
      id: outdoorid,
      item: "addMembers",
      command: "",
      value: addMembers
    }
  }).then(res => {
    if (callback) {
      callback(res)
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

const updateOutdoorStatus = (outdoorid, status, callback) => {
  console.log("updateOutdoorStatus")
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: {
      table: "Outdoors",
      id: outdoorid,
      item: "status",
      command: "",
      value: status
    }
  }).then(res=>{
    if(callback) {
      callback(res)
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

const updateOutdoorWebsites=(outdoorid, websites)=>{
  console.log("updateOutdoorWebsites")
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: {
      table: "Outdoors",
      id: outdoorid,
      item: "websites",
      command: "",
      value: websites,
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

const updateGroupMembers=(groupid, members)=>{
  console.log("updateGroupMembers")
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: { // 
      table: "Groups",
      id: groupid,
      item: "members",
      command: "",
      value: members
    }
  })
}

// 采用云函数对数据进行解密
const decrypt=(encrypedData, iv, code, callback)=>{
  console.log("cloudfun.decrypt")
  wx.cloud.callFunction({
    name: 'decrypt', // 云函数名称
    data: { // 
      encrypedData: encrypedData,
      iv: iv,
      code:code,
    }
  }).then(res=>{
    console.log("cloudfun.decrypt res:")
    console.log(res)
    if(callback){
      callback(res.result)
    }
  })
}

// 得到服务器时间
const getServerDate=(callback)=>{
  wx.cloud.callFunction({
    name: 'getDate', // 云函数名称
  }).then(res => {
    console.log(res)
    if (callback) {
      callback(res.result)
    }
  })
}

module.exports = {
  // Outdoors
  updateOutdoor: updateOutdoor, 
  updateOutdoorChat: updateOutdoorChat,
  updateOutdoorChatSeen: updateOutdoorChatSeen,
  updateOutdoorChatQrcode: updateOutdoorChatQrcode,
  pushOutdoorChatMsg: pushOutdoorChatMsg,

  updateOutdoorMembers: updateOutdoorMembers,
  pushOutdoorMember: pushOutdoorMember,
  updateOutdoorAddMembers: updateOutdoorAddMembers, // 更新附加队员
  
  updateOutdoorStatus: updateOutdoorStatus,
  addOutdoorNoticeCount: addOutdoorNoticeCount,

  updateOutdoorWebsites: updateOutdoorWebsites,
  pushOutdoorLvyeWaiting: pushOutdoorLvyeWaiting,
  shiftOutdoorLvyeWaitings: shiftOutdoorLvyeWaitings,

  updateOutdoorFormids: updateOutdoorFormids,

  // Persons
  unshiftPersonCared:unshiftPersonCared,
  updatePersonFormids: updatePersonFormids,
  updatePersonSubscriber: updatePersonSubscriber,

  // Groups
  updateGroupMembers:updateGroupMembers, // 更新群的成员

  // other 
  decrypt: decrypt,  // 采用云函数进行数据解密
  getServerDate: getServerDate, 
}