// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init()
const request = require('request');
const md5 = require("md5-node");
const formUrlencoded = require('form-urlencoded').default;
const xunfeisdk = require("xunfeisdk");
var qs = require('querystring');

// 云函数入口函数
exports.main = async (event, context) => {
  // return text event.voice

  console.log(event.voice)
  const fileID = event.voice
  const file = await cloud.downloadFile({
    fileID,
  })
  console.log(file)
  const buffer = file.fileContent // .toString("base64") // utf8
  console.log(buffer)
/*
  const client = new xunfeisdk.Client("5c26d560");
  // 语音听写(即语音转换为文字)
  client.IATAppKey = "31500ad7d6f2ab5e860651dca3c385dd"
  // const audio = fs.readFileSync(path.join(__dirname, "要转换为文字的音频.wav"));
  try {
    const result = await client.IAT(buffer, "sms8k", "raw");
    console.log(result)
    return result
  } catch (error) {
    console.log(error)
  }
  return */
  
  // header 
  var param = {
    engine_type: "sms16k",
    aue: "raw"
  }
  var xParam = Buffer.from(JSON.stringify(param)).toString("base64")
  console.log(xParam)

  var xAppid = "5c26d560"
  var xCurTime = Math.floor( (new Date()).getTime()/1000 )
  console.log(xCurTime)
  var xKey = "31500ad7d6f2ab5e860651dca3c385dd"
  var xCheckSum = md5(xAppid + xCurTime + xParam);
  console.log(xCheckSum)

  var url = "http://api.xfyun.cn/v1/service/v1/iat"
  var data = qs.stringify({ audio: encodeURI(Buffer.from(buffer).toString("base64"))})
  var options = {
    url: url,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      "charset":"utf-8", 
      "X-CurTime": xCurTime, 
      "X-Param": xParam,
      "X-Appid": xAppid,
      "X-CheckSum": xCheckSum,
    },
    body:data, // body 得这么写
  }

  const apireq = options => new Promise((resolve, reject) => request(options, (err, response, body) => {
    if (err) {
      reject(err);
    } else {
      resolve(body);
    }
  }));

  let res = await apireq(options)
  console.log(res)
  return res
}