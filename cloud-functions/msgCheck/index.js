// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init()

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const checkmsg = await cloud.openapi.security.msgSecCheck({
    content: event.content
    })
    return checkmsg
  } catch (err) {
    console.log(err)
    return err
  }
}
