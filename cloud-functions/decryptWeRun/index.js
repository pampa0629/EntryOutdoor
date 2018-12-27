// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init()
var WXBizDataCrypt = require('./WXBizDataCrypt')

// 云函数入口函数
exports.main = async (event, context) => {
  // encrypedData  iv code
  console.log(event)

  var appID = "wx20edd5723fb67799"
  var res = await cloud.callFunction({
    name: 'code2Session', // 云函数名称
    data: { // 
      code: event.code,
    }
  })
  console.log(res)

  var pc = new WXBizDataCrypt(appID, res.result.session_key)
  var data = pc.decryptData(event.encrypedData, event.iv)
  console.log('解密后 data: ', data)
  return data
}