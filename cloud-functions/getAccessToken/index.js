// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init()
const request = require('request');
 
// 云函数入口函数
exports.main = async (event, context) => {
  // return  access_token
  var appID = "wx20edd5723fb67799"
  var AppSecret = "bc31a88d18849a4bc91e9b50379c3c1d"
  var grant_type = "client_credential"
  var url = "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=" + appID + "&secret=" + AppSecret
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