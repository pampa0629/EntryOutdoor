const cloud = require('wx-server-sdk')
cloud.init()
exports.main = async (event, context) => {
  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser: event.openid,
      templateId: event.tempid,
      page: event.page,
      data: event.data,
    })
    console.log(result)
    return result
  } catch (err) { 
    console.log(err)
    return err
  }
}