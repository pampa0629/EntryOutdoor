const util = require('./util.js')
const app = getApp()
wx.cloud.init()
const db = wx.cloud.database()
const dbPersons = db.collection('Persons')
const dbOutdoors = db.collection('Outdoors')
const _ = db.command
  
const updateOutdoor=(outdoorid, od, callback)=>{
  console.log("updateOutdoor")
  wx.cloud.callFunction({ 
    name: 'updateOutdoor', // 云函数名
    data: { 
      outdoorid: outdoorid, 
      data: od
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

// 更换领队
const updateOutdoorLeader = (outdoorid, leader, callback) => {
  console.log("updateOutdoorLeader")
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: {
      table: "Outdoors",
      id: outdoorid,
      item: "leader",
      command: "",
      value: leader
    }
  }).then(res => {
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

const clearOutdoorLvyeWaitings=(outdoorid, callback)=>{
  console.log("updateOutdoorLvyeWaitings")
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: {
      table: "Outdoors",
      id: outdoorid,
      item: "websites.lvyeorg.waitings",
      command: "",
      value: [],
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

const updateOutdoorBriefPics = (outdoorid, pics) => {
  console.log("updateOutdoorBriefPics")
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: {
      table: "Outdoors",
      id: outdoorid,
      item: "brief.pics",
      command: "",
      value: pics,
    }
  })
}

const updateOutdoorTrackFiles = (outdoorid, trackFiles) => {
  console.log("updateOutdoorTrackFiles")
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: {
      table: "Outdoors",
      id: outdoorid,
      item: "route.trackFiles",
      command: "",
      value: trackFiles,
    }
  })
}

const updateOutdoorDisclaimer = (outdoorid, disclaimer)=>{
  console.log("updateOutdoorDisclaimer()")
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: {
      table: "Outdoors",
      id: outdoorid,
      item: "limits.disclaimer",
      command: "",
      value: disclaimer,
    }
  })
}

const updateOutdoorPay=(outdoorid, pay)=>{
  console.log("updateOutdoorPay")
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: {
      table: "Outdoors",
      id: outdoorid,
      item: "pay",
      command: "",
      value: pay,
    }
  })
}

const updateOutdoorPayQrcode = (outdoorid, qrcode) => {
  console.log("updateOutdoorPayQrcode")
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: {
      table: "Outdoors",
      id: outdoorid,
      item: "pay.qrcode",
      command: "",
      value: qrcode,
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

const updatePersonGroups = (personid, groups) => {
  console.log("updateGroups")
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: { // 
      table: "Persons",
      id: personid,
      item: "groups",
      command: "",
      value: groups
    }
  })
} 

///////////// 户外群组管理 ////////////////
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

// 更新群主
const updateGroupOwner = (groupid, owner) => {
  console.log("updateGroupOwner")
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: { // 
      table: "Groups",
      id: groupid,
      item: "owner",
      command: "",
      value: owner
    }
  })
}

const updateGroupRank=(groupid, rank)=>{
  console.log("updateGroupRank")
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: { // 
      table: "Groups",
      id: groupid,
      item: "rank",
      command: "",
      value: rank
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
  updateOutdoorLeader: updateOutdoorLeader,
  pushOutdoorMember: pushOutdoorMember,
  updateOutdoorAddMembers: updateOutdoorAddMembers, // 更新附加队员
  
  updateOutdoorStatus: updateOutdoorStatus,
  addOutdoorNoticeCount: addOutdoorNoticeCount,

  updateOutdoorWebsites: updateOutdoorWebsites,
  pushOutdoorLvyeWaiting: pushOutdoorLvyeWaiting,
  clearOutdoorLvyeWaitings: clearOutdoorLvyeWaitings,

  updateOutdoorFormids: updateOutdoorFormids,

  updateOutdoorPay: updateOutdoorPay, // 支付信息
  updateOutdoorPayQrcode: updateOutdoorPayQrcode, // 支付二维码

  updateOutdoorBriefPics: updateOutdoorBriefPics, // 更新照片存储路径
  updateOutdoorTrackFiles: updateOutdoorTrackFiles, // 更新轨迹文件路径

  updateOutdoorDisclaimer: updateOutdoorDisclaimer, // 更新免责条款

  // Persons
  unshiftPersonCared:unshiftPersonCared,
  updatePersonFormids: updatePersonFormids,
  updatePersonSubscriber: updatePersonSubscriber,
  updatePersonGroups: updatePersonGroups, 

  // Groups
  updateGroupMembers:updateGroupMembers, // 更新群的成员
  updateGroupOwner: updateGroupOwner, // 更新群主
  updateGroupRank: updateGroupRank, // 更新排行榜

  // other 
  decrypt: decrypt,  // 采用云函数进行数据解密
  getServerDate: getServerDate, 
}