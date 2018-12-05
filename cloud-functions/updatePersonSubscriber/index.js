// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const dbPersons = db.collection("Persons")
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  // event.leaderid, memberid, subscribe
  try {
    return await dbPersons.doc(event.leaderid).update({
      data: {
        ["subscribers." + event.memberid]: event.subscribe
      }
    })
  } catch (e) {
    console.error(e)
  }
}
