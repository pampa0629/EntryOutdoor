const CryptoJS = require('../libs/cryptojs.js')

// 加密
const encrypt = (obj, pwd) => {
  var json = JSON.stringify(obj).toString(CryptoJS.enc.Utf8);
  var encryptData = CryptoJS.AES.encrypt(json, pwd, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  });
  var str = encryptData.toString()
  return str
} 

// 解密
const decrypt = (str, pwd) => {
  var decryptData = CryptoJS.AES.decrypt(str, pwd, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  });
  var result = decryptData.toString(CryptoJS.enc.Utf8);
  var json = JSON.parse(result);
  return json
}

module.exports = {
  encrypt: encrypt,
  decrypt: decrypt,
}