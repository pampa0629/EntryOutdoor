const app = getApp()
const util = require('./util.js')
const cloudfun = require('./cloudfun.js')
const template = require('./template.js')
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

// 调用ai，出错自动重复
const aiOneFace = async(imageUrl, count) => {
  console.log("facetools.aiOneFace() ", imageUrl, count)
  let res = await promisify.request({
    url: "https://service-q0d7fjgg-1258400438.gz.apigw.tencentcs.com/release/helloworld?url=" + imageUrl
  })
  console.log("ai face res:", res)
  if (res.statusCode == 504) {
    if (count >= 0) {
      return await aiOneFace(imageUrl, count - 1)
    }
  }
  return res.data
}

// ai识别一张照片
const aiOdFace = async(outdoorid, face, id, count) => {
  console.log("facetools.aiOdFace() ", outdoorid, face, id, count)

  const resTemp = await wx.cloud.getTempFileURL({
    fileList: [face.url]
  })
  const imageUrl = resTemp.fileList[0].tempFileURL
  console.log("url:", imageUrl)

  let data = await aiOneFace(imageUrl, 5)

  // 结果写入数据库
  if (data.errorCode) {
    face.error = data.errorMessage
  } else {
    face.id = id
    face.count = data[0].length
    face.boxes = data[0]
    face.codes = data[1]
    face.persons = {} 
  }
  cloudfun.opOutdoorItem(outdoorid, "faces." + id, face, "")
}

// 得到一个活动中，所有成员的人脸特征码集合
const getMemFacecodes = async(outdoorid)=>{
  console.log("facetools.getMemFacecodes()", outdoorid)
  let resOd = await dbOutdoors.doc(outdoorid).get()
  var memsCodes = {}
  for (var i in resOd.data.members) {
    const item = resOd.data.members[i]
    let resPsn = await dbPersons.doc(item.personid).get()
    memsCodes[item.personid] = {
      personid: item.personid,
      nickName:resPsn.data.userInfo.nickName,
      facecodes: resPsn.data.facecodes
    }
  }
  return memsCodes
}

const findMinDist = (code, memsCodes, oldDist) =>{
  console.log("facetools.findMinDist()", oldDist)
  var minDist = oldDist ?oldDist:1.0
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

const matchOdFaces = async(outdoorid, faces)=>{
  console.log("facetools.matchOdFaces()", outdoorid, faces)
  let memsCodes = await getMemFacecodes(outdoorid)
  for(var id in faces) {
    const face = faces[id]
    for(var i in face.codes) {
      var oldDist = 1.0
      if (faces[id].persons && faces[id].persons[i] ) {
        oldDist = faces[id].persons[i].dist
      }
      var res = findMinDist(face.codes[i], memsCodes, oldDist)
      if (res.personid) {
        console.log("res:", res)
        if (!face.persons) {
          face.persons = {}
        }
        face.persons[i] = {
          personid: res.personid,
          nickName: memsCodes[res.personid].nickName,
          dist:res.dist
        }
        let name = "faces." + id + ".persons." + i
        await cloudfun.opOutdoorItem(outdoorid, name, face.persons[i], "")
      }
    }
  }
}

// 识别一组照片
const aiOdFaces = async(outdoorid, faces) => {
  console.log("facetools.aiOdFaces()", outdoorid, faces)
  for (var id in faces) {
    var face = faces[id]
    await aiOdFace(outdoorid, face, id, 5)
  }
  matchOdFaces(outdoorid, faces)
}

// 上传选择的相册照片，返回云存储地址
const uploadOdFaces = async(outdoorid, owner, tempFiles) => {
  console.log("facetools.uploadOdFaces()", outdoorid, owner, tempFiles)
  var faces = {}
  wx.showLoading({
    title: "正在上传照片"
  })
  for (var i in tempFiles) {
    var id = tempFiles[i].size // 以文件大小（size）作为文件名
    let resUpload = await wx.cloud.uploadFile({
      cloudPath: util.buildOutdoorFace(outdoorid, id),
      filePath: tempFiles[i].path
    })
    const face = {
      url: resUpload.fileID,
      owner: owner,
      count: -1  // -1代表尚未进行ai识别
    } 
    faces[id] = face
    await cloudfun.opOutdoorItem(outdoorid, "faces." + id, face, "")
  }
  wx.hideLoading()
  return faces
}

const calcCodeID = (code)=>{
  console.log("facetools.calcCodeID()")
  var id = 0
  for(var i=0; i<512; i++) {
    id += Math.abs(code[i])
  }
  id = Math.floor(id*1000000)
  console.log("code id:", id)
  return id
}

module.exports = {
  
  uploadOdFaces: uploadOdFaces, // 上传活动照片
  aiOdFaces: aiOdFaces, // 识别人脸照片，并存储到Outdoors中
  aiOdFace: aiOdFace, // 识别一张人脸，并存储到Outdoors中

  aiOneFace: aiOneFace, // 识别一张人脸

  getDist: getDist, // 计算人脸特征码距离

  calcCodeID: calcCodeID, // 计算特征码的id
  matchOdFaces: matchOdFaces, // 匹配od中所有人员


}