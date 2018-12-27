// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init()
const request = require('request');

// 云函数入口函数
exports.main = async (event, context) => {
  // code
  var appID = "wx20edd5723fb67799"
  var appSecret = "bc31a88d18849a4bc91e9b50379c3c1d"
  var grant_type = "authorization_code"
  // GET https://api.weixin.qq.com/sns/jscode2session?appid=APPID&secret=SECRET&js_code=JSCODE&grant_type=authorization_code
  var url = "https://api.weixin.qq.com/sns/jscode2session?appid=" + appID + "&secret=" + appSecret + "&js_code=" + event.code + "&grant_type=" + grant_type
  console.log(url)

  const apireq = url => new Promise((resolve, reject) => request.get(url, (err, response, body) => {
    if (err) {
      reject(err);
    } else {
      resolve(body);
    }
  }));

  let res = await apireq(url)
  console.log(res)
  return res
}