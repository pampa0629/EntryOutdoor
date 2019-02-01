// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const _ = db.command
 
// 云函数入口函数
exports.main = async (event, context) => {
  // table,id,item,command(push,pop,shift,unshift,""),value
  let item = event.item
  try {
    const doc = db.collection(event.table).doc(event.id)
    if (!event.command) {
      return await doc.update({
        data: {
          [item]: event.value //更新
        }
      })
    } else if(event.command == "push") {
      return await doc.update({
        data: {
          [item]: _.push(event.value)
        }
      })
    } else if (event.command == "pop") {
      return await doc.update({
        data: {
          [item]: _.pop()
        }
      })
    } else if (event.command == "shift") {
      return await doc.update({
        data: {
          [item]: _.shift() 
        }
      })
    } else if (event.command == "unshift") {
      return await doc.update({
        data: {
          [item]: _.unshift(event.value) 
        }
      })
    } else if (event.command == "inc") {
      return await doc.update({
        data: {
          [item]: _.inc(event.value)
        }
      })
    } else {
      console.error("缺少对该命令的代码实现：" + event.command)
    }
    
  } catch (e) {
    console.error(e)
  }
}
