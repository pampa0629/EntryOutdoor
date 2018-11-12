// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const dbOutdoors = db.collection("Outdoors")
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  // event.outdoorid
  try {
    return await dbOutdoors.doc(event.outdoorid).update({
      data: {
        "websites.lvyeorg.waitings": _.shift() // 删除第一条
      }
    })
  } catch (e) {
    console.error(e)
  }
}