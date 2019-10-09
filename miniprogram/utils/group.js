const util = require('./util.js')
const cloudfun = require('./cloudfun.js')

wx.cloud.init()
const db = wx.cloud.database({})
const _ = db.command
const dbGroups = db.collection('Groups')

const ensureMember=(groupOpenid, openid, personid, userInfo)=>{
  console.log("group.ensureMember()", groupOpenid, openid, personid, userInfo)
  console.log(groupOpenid)
  const member = { openid: openid, personid: personid, userInfo: userInfo}
  dbGroups.where({
    groupOpenid: _.eq(groupOpenid)
  }).get().then(res => {
    // console.log(res)
    if(res.data.length > 0) {
      dbGroups.doc(res.data[0]._id).get().then(res=>{
        res.data.members[openid] = member
        // console.log("group id: "+res.data._id)
        // console.log(res.data.members)
        // cloudfun.updateGroupMembers(res.data._id, res.data.members)
        cloudfun.opGroupItem(res.data._id, "members", res.data.members, "")
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
        // console.log("add one group:")
        // console.log(res)
        var members = {}
        members[openid] = member
        // cloudfun.updateGroupMembers(res._id, members)
        cloudfun.opGroupItem(res._id, "members", members, "")
      })
    }
  })
}
 
// 转让群主
const changeOwner=(groupid, ownerOpenid, callback)=>{
  console.log("group.changeOwner")
  dbGroups.doc(groupid).get().then(res=>{
    var owner = res.data.members[ownerOpenid]
    // cloudfun.updateGroupOwner(groupid, owner)
    cloudfun.opGroupItem(groupid, "owner", owner, "")
    if (callback) {
      callback(owner)
    }
  })
}

const saveRank=(groupid, rank)=>{
  // cloudfun.updateGroupRank(groupid, rank)
  cloudfun.opGroupItem(groupid, "rank", rank, "")
}

module.exports = {
  ensureMember: ensureMember,  // 确保群里有该成员
  changeOwner: changeOwner, // 转让群主
  saveRank: saveRank, // 保存排行榜
}