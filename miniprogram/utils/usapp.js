const app = getApp()  

// 构建一条留言
const buildChatMessage = (msg) => {
  var message = {}
  //  { who: "", msg: "", personid:"", self: false},
  message.personid = app.globalData.personid
  if (app.globalData.personid) {
    message.who = app.globalData.userInfo.nickName
  } else {
    message.who = "游客"
  }
  message.msg = msg
  message.self = true // 肯定是自己了
  return message
}

module.exports = {
  
  // 构建一条留言
  buildChatMessage:buildChatMessage, 
}