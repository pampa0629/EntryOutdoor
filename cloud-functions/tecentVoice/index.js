// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init()
const request = require('request');
const tencentcloud = require("tencentcloud-sdk-nodejs");

// 云函数入口函数
exports.main = async(event, context) => { 
  // return text event.voice

  console.log(event.voice)
  const fileID = event.voice
  const file = await cloud.downloadFile({
    fileID,
  })
  console.log(file)
  const buffer = file.fileContent // .toString("base64") // utf8
  
  var dataLen = file.fileContent.length
  console.log(dataLen)
  var voice = buffer.toString("base64")
  console.log(voice)

  // 导入对应产品模块的client models。
  const AaiClient = tencentcloud.aai.v20180522.Client; // v20170312
  const models = tencentcloud.aai.v20180522.Models;

  const Credential = tencentcloud.common.Credential;
  const ClientProfile = tencentcloud.common.ClientProfile;
  const HttpProfile = tencentcloud.common.HttpProfile;

  // 实例化一个认证对象，入参需要传入腾讯云账户secretId，secretKey
  let cred = new Credential("AKIDiCUv7dM2rRlphJptqYFoAGD6rOuCr9TY", "82hCSWnrfEZmlYDm9HAnEPO8h06zfCVm");

  let httpProfile = new HttpProfile();
  httpProfile.endpoint = "aai.tencentcloudapi.com";
  let clientProfile = new ClientProfile();
  clientProfile.httpProfile = httpProfile;
  let client = new AaiClient(cred, "ap-beijing", clientProfile);

  // 实例化一个请求对象
  let req = new models.SentenceRecognitionRequest();
  // let req = new models.TextToVoiceRequest();
  
  var data = {
    // Text:"你好啊",
    // SessionId: (new Date()).getTime(),
    // ModelType:1,
    appId: 1258400438, // "wx20edd5723fb67799",// "1258400438", var appID = "wx20edd5723fb67799"
    Data: voice,
    DataLen: dataLen,
    EngSerViceType: "16k",
    Nonce: (new Date()).getTime(),
    ProjectId: 10163441, 
    SourceType: 1,
    SubServiceType: 2,
    UsrAudioKey: (new Date()).getTime(),
    Version: "2018-05-22",
    VoiceFormat: "mp3",
  }
  // 传入json参数
  // console.log(JSON.stringify(data));
  req.from_json_string(JSON.stringify(data));

  let result = await client.SentenceRecognition(req, function (err, response) {
    console.log("client.SentenceRecognition");
    if (err) {
      console.log(err);
      return;
    }
    // 请求正常返回，打印response对象
    console.log(response.to_json_string());
  })
  console.log("result: " + result);
  return result

}

/***

  var data = {
    Action: "SentenceRecognition",
    Data: buffer.toString("base64"),
    DataLen: dataLen,
    EngSerViceType: "16k",
    Nonce: (new Date()).getTime(),
    ProjectId: "0",
    Region: "ap-beijing",
    SecretId: "AKIDiCUv7dM2rRlphJptqYFoAGD6rOuCr9TY",
    //Signature: "82hCSWnrfEZmlYDm9HAnEPO8h06zfCVm",
    SignatureMethod:"HmacSHA256",
    SourceType: "1",
    SubServiceType: "2",
    Timestamp: Math.floor((new Date()).getTime() / 1000),
    UsrAudioKey: "",
    Version: "2018-05-22",
    VoiceFormat: "mp3",
  }
  var param = qs.stringify(data)
  console.log(param)
  var temp = hash_hmac(data)

  var data = qs.stringify({ audio: encodeURI(Buffer.from(buffer).toString("base64")) })
  var options = {
    url: url,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      "charset": "utf-8",
      "X-CurTime": xCurTime,
      "X-Param": xParam,
      "X-Appid": xAppid,
      "X-CheckSum": xCheckSum,
    },
    body: data, // body 得这么写
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

} */