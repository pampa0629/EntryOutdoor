const app = getApp()
const util = require('./util.js')
const cloudfun = require('./cloudfun.js')
const message = require('./message.js')
const promisify = require('./promisify.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
const dbPersons = db.collection('Persons')
const _ = db.command

const getDist = (code1, code2) => {
  // dist = np.sqrt(np.sum(np.square(np.subtract(emb1, emb2))))
  var sum = 0
  for (var i = 0; i < 512; i++) {
    var sub = code1[i] - code2[i]
    var square = sub * sub
    sum += square
  }
  return Math.sqrt(sum)
}

// 根据特征值距离，推算概率百分比
const getMaybe = (dist) =>{
  var temp = 1-dist
  temp = Math.sqrt(temp)
  temp = Math.sqrt(temp)
  return Math.floor(temp*100)
}

// 调用ai，出错自动重复
const aiOnePhoto = async(imageUrl, count) => {
  console.log("facetools.aiOneFace() ", imageUrl, count)
  let res = await promisify.request({
    url: "https://service-q0d7fjgg-1258400438.gz.apigw.tencentcs.com/release/helloworld?url=" + imageUrl
  })
  console.log("ai face res:", res)
  if (res.statusCode == 504) { // 超时，多试几次
    if (count >= 0) {
      return await aiOnePhoto(imageUrl, count - 1)
    }
  }
  return res.data
}

// ai识别一张照片
const aiOdPhoto = async(outdoorid, photo, id, count) => {
  console.log("facetools.aiOdPhoto() ", outdoorid, photo, id, count)

  const resTemp = await wx.cloud.getTempFileURL({
    fileList: [photo.src]
  })
  const imageUrl = resTemp.fileList[0].tempFileURL
  console.log("url:", imageUrl)

  let data = await aiOnePhoto(imageUrl, 5)

  // 结果写入数据库
  if (data.errorCode) {
    photo.error = { code: data.errorCode, message:data.errorMessage}
    wx.showModal({
      title: 'AI识别出错',
      content: '有照片AI识别出错，请重新上传或压缩后上传。错误信息为：' + photo.error.message,
      showCancel:face,
    })
  } else { 
    delete photo.error
    photo.id = id
    photo.facecount = data[0].length // 有length么?
    photo.faces = []
    for (var i in data[0]) {
      var face = {
        box: data[0][i],
        code: data[1][i],
        personid:null, 
        nickName:"",
        dist:1
      }
      photo.faces.push(face)
    }
  }
  cloudfun.opOutdoorItem(outdoorid, "photos." + id, photo, "")
  return photo
}

// 得到一个活动中，所有成员的人脸特征码集合
const getMemsFacecodes = async(outdoorid) => {
  console.log("facetools.getMemsFacecodes()", outdoorid)
  let resOd = await dbOutdoors.doc(outdoorid).field({members: true,}).get()
  var memsCodes = {}
  var personids = []
  for (var i = 0; i < resOd.data.members.length; i++) {
    personids.push(resOd.data.members[i].personid)
    if (personids.length == 20 || i == resOd.data.members.length - 1) {
      let resPsns = await dbPersons.where({
        _id: _.in(personids)
      }).field({
        userInfo: true,
        facecodes: true,
      }).get()
      // console.log("resPsns:", resPsns)
      for (var j in resPsns.data) {
        const resPsn = resPsns.data[j]
        memsCodes[resPsn._id] = {
          personid: resPsn._id,
          nickName: resPsn.userInfo.nickName,
          facecodes: resPsn.facecodes
        }
      }
      personids = []
    }
  }

  return memsCodes
}

// 把照片中的一个人脸，与mems个人的所登记的特征码进行计算，得到最小值
// 找到返回最小值和对应的人员id，没找到返回null
const findMinDist = (code, memsCodes, oldDist) => {
  console.log("facetools.findMinDist()", oldDist)
  var minDist = oldDist ? oldDist : 1.0
  console.log("minDist", minDist)
  var personid = null
  for (var pid in memsCodes) {
    const memCodes = memsCodes[pid].facecodes
    if (memCodes) {
      for (var cid in memCodes) {
        // console.log("cid", cid, "memCode:", memCodes[cid])
        var dist = getDist(code, memCodes[cid].code)
        // console.log("dist:", dist, "person id:", pid, "code id:", cid)
        if (dist < minDist) {
          minDist = dist
          personid = pid
        }
      }
    }
  }
  return {
    personid: personid,
    dist: minDist
  }
}

// 匹配一张照片，与一个code
const matchOnePhoto = (outdoorid, photo, code, personid, nickName)=>{
  console.log("facetools.matchOnePhoto()")
  var changed = false
  var most = {dist:1} // 只记录最好的一个
  for (var i in photo.faces) { // 每个人脸
    const face = photo.faces[i]
    var oldDist = face.dist ? face.dist:1.0
    var dist = getDist(face.code, code)
    if (dist < oldDist) { // 首先得比原来的好
      changed = true
      if (dist<most.dist) { // 假设：一张照片中只有一个自己
        most.id = i
        most.dist = dist
        most.personid = personid
        most.nickName = nickName
      }
    }
  }
  if(changed) {
    const face = photo.faces[most.id]
    face.dist = most.dist
    face.personid = most.personid
    face.nickName = most.nickName

    cloudfun.opOutdoorItem(outdoorid, "photos." + photo.id, photo, "")
  }
  return changed
}

// 把一个活动中的所有成员，和 faces照片做匹配
const matchOdPhotos = async(outdoorid, photos) => {
  console.log("facetools.matchOdPhotos()", outdoorid, photos)
  wx.showLoading({ title: "正在匹配队员" })
  let memsCodes = await getMemsFacecodes(outdoorid)
  for (var pid in photos) {
    const photo = photos[pid]
    var changed = false
    for (var i in photo.faces) {
      var face = photo.faces[i]
      var res = findMinDist(face.code, memsCodes, face.dist)
      if (res.personid) {
        console.log("res:", res)
        face.personid = res.personid
        face.nickName = memsCodes[res.personid].nickName,
        face.dist = res.dist
        changed = true
      }
    }
    if (changed) {
      await cloudfun.opOutdoorItem(outdoorid, "photos." + pid, photo, "")
    }
  }
  wx.hideLoading()
}

// 识别一组照片
const aiOdPhotos = async(outdoorid, photos) => {
  console.log("facetools.aiOdFaces()", outdoorid, photos)
  wx.showLoading({title: "正在AI识别中"})
  for (var id in photos) {
    var photo = photos[id]
    await aiOdPhoto(outdoorid, photo, id, 5)
  }
  wx.hideLoading()
  matchOdPhotos(outdoorid, photos)
}

// 上传选择的相册照片，返回云存储地址
const uploadOdPhotos = async(outdoorid, owner, tempFiles) => {
  console.log("facetools.uploadOdPhotos()", outdoorid, owner, tempFiles)
  var photos = {}
  wx.showLoading({title: "正在上传照片"})
  for (var i in tempFiles) {
    var id = tempFiles[i].size // 以文件大小（size）作为文件名，避免重复上传同一张照片
    let resUpload = await wx.cloud.uploadFile({
      cloudPath: util.buildOutdoorPhoto(outdoorid, id),
      filePath: tempFiles[i].path
    })
    const photo = {
      id:id, 
      src: resUpload.fileID,
      owner: owner,
      facecount: -1 // -1代表尚未进行ai识别
    }
    photos[id] = photo
    await cloudfun.opOutdoorItem(outdoorid, "photos." + id, photo, "")
  }
  wx.hideLoading()
  return photos
}

const dealOdPhotos = async (od, owner, tempFiles) => { 
  console.log("facetools.dealOdPhotos()")
  let photos = await uploadOdPhotos(od.outdoorid, owner, tempFiles)
  console.log("photos:", photos)
  const count = Object.keys(photos).length
  if (count>0) {
    aiOdPhotos(od.outdoorid, photos)
    let res = await dbOutdoors.doc(od.outdoorid).field({ sendPhoto: true, }).get()
    console.log("sendPhoto:", res.data.sendPhoto)
    if (!res.data.sendPhoto) {
      await cloudfun.opOutdoorItem(od.outdoorid, "sendPhoto", true, "")
      owner.nickName = owner.nickName ? owner.nickName : "游客"
      for (var i in od.members) {
        const member = od.members[i]
        // 订阅消息
        message.sendOdInfoChange(member.personid, od.outdoorid, od.title.whole, "有活动照片上传，点击查看")
      }
    }
  }
  return count
}

const calcCodeID = (code) => {
  console.log("facetools.calcCodeID()")
  var id = 0
  for (var i = 0; i < 512; i++) {
    id += Math.abs(code[i])
  }
  id = Math.floor(id * 1000000)
  console.log("code id:", id)
  return id
}

module.exports = {
  dealOdPhotos: dealOdPhotos, // 上传，识别，通知，一条龙服务
  uploadOdPhotos: uploadOdPhotos, // 上传活动照片
  aiOdPhotos: aiOdPhotos, // 识别人脸照片，并存储到Outdoors中
  aiOdPhoto: aiOdPhoto, // 识别一张人脸，并存储到Outdoors中

  aiOnePhoto: aiOnePhoto, // 识别一张人脸

  getDist: getDist, // 计算人脸特征码距离
  getMaybe: getMaybe, // 根据特征码距离，计算可能性的百分比

  calcCodeID: calcCodeID, // 计算特征码的id
  matchOdPhotos: matchOdPhotos, // 匹配od中所有人员
  getMemsFacecodes: getMemsFacecodes, // 得到一个活动中，所有成员的人脸特征码集合

  matchOnePhoto: matchOnePhoto, // 

}