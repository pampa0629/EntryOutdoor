// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const _ = db.command
const dbOutdoors = db.collection('Outdoors')

// 云函数入口函数
exports.main = async (event, context) => {
  // outdoorid, data
  return await dbOutdoors.doc(event.outdoorid).update({
    data: {
      brief: event.data.brief,
      chat: event.data.chat,
      limits: event.data.limits,
      meets: event.data.meets,
      members: event.data.members,
      route: _.set(event.data.route),
      status: event.data.status,
      title:event.data.title,
      traffic: event.data.traffic,
      websites: event.data.websites,
    }
  })
}
