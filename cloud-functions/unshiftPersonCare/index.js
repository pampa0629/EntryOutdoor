// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const dbPersons = db.collection("Persons")
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  // event.personid, outdoorid, title
  try {
    return await dbPersons.doc(event.personid).update({
      data: {
        caredOutdoors: _.unshift({id:event.outdoorid, title:event.title}) // 再最前面追加一条
      }
    })
  } catch (e) {
    console.error(e)
  }
}