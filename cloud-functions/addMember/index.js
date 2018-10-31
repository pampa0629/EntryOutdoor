// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const dbOutdoors = db.collection("Outdoors")
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
// event.outdoorid, member
  try {
    return await dbOutdoors.doc(event.outdoorid).update({ 
      data: {
        members: _.push(event.member) //追加
      }
    })
  } catch (e) {
    console.error(e)
  }
}