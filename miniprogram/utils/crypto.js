const CryptoJS = require('../libs/cryptojs.js')
 
// 加密
const encrypt = (obj, pwd) => {
  console.log("crypto.encrypt")
  console.log("obj:"); console.log(obj)
  console.log("pwd:"); console.log(pwd)
  var json = JSON.stringify(obj).toString(CryptoJS.enc.Utf8);
  console.log("json:"); console.log(json)
  var encryptData = CryptoJS.AES.encrypt(json, pwd, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  })
  console.log("encryptData:"); console.log(encryptData)
  // var base64 = CryptoJS.enc.Base64.stringify(encryptData)
  var str = encryptData.toString()
  console.log("str:"); console.log(str)
  return str
} 

// 解密
const decrypt = (str, pwd) => {
  console.log("crypto.decrypt")
  console.log("str:"); console.log(str)
  console.log("pwd:"); console.log(pwd)
  // var base64 = CryptoJS.enc.Base64.parse(str)
  var decryptData = CryptoJS.AES.decrypt(str, pwd, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  })
  console.log("decryptData:"); console.log(decryptData)
  var result = decryptData.toString(CryptoJS.enc.Utf8);
  console.log("result:"); console.log(result)
  var json = JSON.parse(result);
  console.log("json:"); console.log(json)
  return json
}

module.exports = {
  encrypt: encrypt,
  decrypt: decrypt,
}