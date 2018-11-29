// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init()
const request = require('request');

// 云函数入口函数
exports.main = async (event, context) => {
  // event.openid, tempid,page,formid,access_token,data
  let opts = {
    touser: event.openid,
    template_id: event.tempid,
    form_id: event.formid,
    page: event.page, 
    data: event.data
  }
  let data = {
    method: 'POST',
    url: "https://api.weixin.qq.com/cgi-bin/message/wxopen/template/send?access_token=" + event.access_token,
    body: JSON.stringify(opts),
    header: {
      'content-type': 'application/json' // 默认值
    }
  }
  console.log(data)

  const apireq = data => new Promise((resolve, reject) => request(data, (err, response, body) => {
    if (err) {
      reject(err);
    } else {
      resolve(body);
    }
  }));

  let res = await apireq(data)
  console.log(res)
  return res
} 