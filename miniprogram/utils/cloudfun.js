wx.cloud.init()
const db = wx.cloud.database({})
const dbPhotos = db.collection('Photos')

const updateOutdoor = async(outdoorid, od) => {
  console.log("updateOutdoor")
  await wx.cloud.callFunction({
    name: 'updateOutdoor', // 云函数名
    data: {
      outdoorid: outdoorid,
      data: od
    }
  })
}

// 操作Outdoors表中的某个子项  
const opOutdoorItem = async(outdoorid, item, value, op) => {
  console.log("cloudfun.opOutdoorItem()", outdoorid, item, value, op)
  op = op ? op : "" // 默认的""为更新; push,pop,shift,unshift,""
  return await wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value 
    data: {
      table: "Outdoors",
      id: outdoorid,
      item: item,
      command: op,
      value: value
    }
  })
}

// 操作Photos表中的某个子项  
const opPhotoItem = async(photoid, item, value, op) => {
  console.log("cloudfun.opPhotoItem()", photoid, item, value, op)
  op = op ? op : "" // 默认的""为更新; push,pop,shift,unshift,""
  return await wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value 
    data: {
      table: "Photos",
      id: photoid,
      item: item,
      command: op,
      value: value
    }
  })
}

// 更新Photos表的整个对象
// const updatePhoto = async(photoid, value) => {
//   console.log("cloudfun.updatePhoto()", photoid, value)
//   // 因为都是自己读写，故而先直接调用，需要用云函数时再修改
//   dbPhotos.doc(photoid).update({
//     data: value
//   })  
// }



// 对Persons表的某个子项进行特定数据库操作
const opPersonItem = async(personid, item, value, op) => {
  console.log("cloudfun.opPersonItem()", personid, item, value, op)
  op = op ? op : ""
  return await wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: {
      table: "Persons",
      id: personid,
      item: item,
      command: op,
      value: value
    }
  })
}

///////////// 户外群组管理 ////////////////

// 对Groups表的某个子项进行特定数据库操作
const opGroupItem = async (groupid, item, value, op) => {
  console.log("cloudfun.opPersonItem()")
  console.log(groupid, item, value, op)
  op = op ? op : ""
  return await wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: {
      table: "Groups",
      id: groupid,
      item: item,
      command: op,
      value: value
    }
  })
}


// 采用云函数对数据进行解密
const decrypt = async(encrypedData, iv, code) => {
  console.log("cloudfun.decrypt")
  let res = await wx.cloud.callFunction({
    name: 'decrypt', // 云函数名称
    data: { // 
      encrypedData: encrypedData,
      iv: iv,
      code: code,
    }
  })
  // console.log("cloudfun.decrypt res:", res)
  return res.result
}

// 得到服务器时间
const getServerDate = async () => {
  let res = await wx.cloud.callFunction({
    name: 'getDate', // 云函数名称
  })
  console.log(res)
  return res.result
}

const checkMsg = async(text)=>{
  console.log("cloudfun.checkMsg()",text)
  let res = await wx.cloud.callFunction({
    name: 'msgCheck', // 云函数名
    data: { 
      content: text,
    }
  })
  console.log("msg check res:", res)
  if(res.result.errCode==0) {
    return true
  } else {
    return false
  }
}

module.exports = {
  // Outdoors
  updateOutdoor: updateOutdoor,
  opOutdoorItem: opOutdoorItem, // 操作某个子项，op为""时，操作命令为“更新”
  
  // Persons
  opPersonItem: opPersonItem,

  // Photos
  opPhotoItem: opPhotoItem,
  // updatePhoto: updatePhoto,
  
  // Groups
  opGroupItem: opGroupItem, 
  
  // other 
  decrypt: decrypt, // 采用云函数进行数据解密
  getServerDate: getServerDate,

  // check msg 
  checkMsg: checkMsg, 
}