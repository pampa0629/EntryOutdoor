// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const dbOutdoors = db.collection("Outdoors")
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  // event.outdoorid, members
  try {
    return await dbOutdoors.doc(event.outdoorid).update({
      data: {
        members: event.members //更新
      }
    })
  } catch (e) {
    console.error(e)
  }
}

/**
 * return await dbOutdoors.doc(event.outdoorid).get()
      .then(res => {
        res.data.members.forEach(item, index => {
          if (item.personid == event.member.personid) {
            res.data.members[index] = event.member
          }
          dbOutdoors.doc(event.outdoorid).update({
            data: {
              members: res.data.members //更新
            }
          })
        })
      })
 */