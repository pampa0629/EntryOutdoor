// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const dbPersons = db.collection("Persons")
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  // event.personid, formids
  try {
    return await dbPersons.doc(event.personid).update({
      data: {
        formids: event.formids //更新
      }
    })
  } catch (e) {
    console.error(e)
  }
}
