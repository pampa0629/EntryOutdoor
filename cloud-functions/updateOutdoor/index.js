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
      title:event.data.title,
      route: _.set(event.data.route),
      meets: event.data.meets,
      traffic: event.data.traffic,
      status: event.data.status,
      members: event.data.members,
      brief: event.data.brief,
      limits: event.data.limits,
    }
  })
}
