// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init()
const request = require('request');
const db = cloud.database()
const dbOutdoors = db.collection('Outdoors')

// 云函数入口函数
exports.main = async(event, context) => {
  // event.outdoorid, access_token
  console.log(event)
  var url = "https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=" + event.access_token
  console.log(url)
  var data = { 
      scene: event.outdoorid,
      width: "280px",
      page: "pages/EntryOutdoor/EntryOutdoor",
    }
  var options = {
    url: url,
    method: "POST",
    body: JSON.stringify(data),
    encoding : null // 最坑的一句代码，没有的话，得到的二进制image内容就是错乱的
    //responseType: 'arraybuffer', 小程序端要这么写
  };
  console.log(options)

  const apireq = options => new Promise((resolve, reject) => request(options, (err, response, body) => {
    if (err) {
      reject(err);
    } else {
      resolve(body);
    }
  }));
 
  // 得到 二维码数据流 
  let image = await apireq(options)
  var cloudPath = "Outdoors/" + event.outdoorid + "/QrCode.jpg"

  // 存到云存储上
  let cloudFile = await cloud.uploadFile({
    cloudPath: cloudPath,
    fileContent: image,
  });

  // 写到数据库中
  await dbOutdoors.doc(event.outdoorid).update({
    data: {
      QcCode: cloudFile.fileID
    },
  })

  // 返回云存储链接
  return cloudFile.fileID;
}