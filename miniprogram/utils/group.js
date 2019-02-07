const util = require('./util.js')
const cloudfun = require('./cloudfun.js')

wx.cloud.init()
const db = wx.cloud.database({})
const _ = db.command
const dbGroups = db.collection('Groups')

const ensureMember=(groupOpenid, openid, personid, userInfo)=>{
  console.log("group.ensureMember")
  console.log(groupOpenid)
  const member = { openid: openid, personid: personid, userInfo: userInfo}
  dbGroups.where({
    groupOpenid: _.eq(groupOpenid)
  }).get().then(res => {
    console.log(res)
    if(res.data.length > 0) {
      dbGroups.doc(res.data[0]._id).get().then(res=>{
        res.data.members[openid] = member
        console.log("group id: "+res.data._id)
        console.log(res.data.members)
        cloudfun.updateGroupMembers(res.data._id, res.data.members)
      })
    } else { // 不存在则新创建记录
      let item = "members[" + openid+"]"
      dbGroups.add({
        data:{
          groupOpenid: groupOpenid,
          owner: member,
          members:{},
        }
      }).then(res=>{
        console.log("add one group:")
        console.log(res)
        var members = {}
        members[openid] = member
        cloudfun.updateGroupMembers(res._id, members)
      })
    }
  })
}

module.exports = {
  // 确保群里有该成员
  ensureMember: ensureMember, 
}