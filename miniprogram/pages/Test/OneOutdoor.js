import Page from 'page';
const app = getApp()
const QRCode  = require('../../libs/weapp-qrcode.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
const dbPersons = db.collection('Persons')
const dbTemp = db.collection('Temp')


Page({
  data: {
    home: false,
    formIds: [],
  },

  onLoad() {

  },

  onContact: function(e) {
    console.log(JSON.stringify(e, null, 2))
    wx.showModal({
      title: '客服消息',
      content: JSON.stringify(e, null, 2),
    })
  },

  onTest: function(e) {

    console.log(e.detail.errMsg)
    console.log(e.detail.iv)
    console.log(e.detail.encryptedData)
  },

  likeO() {
    console.log("likeO")

  },

  home() {
    const self = this
    console.log("home")
    this.setData({
      home: !self.data.home,
    })
  },

  dbKey(){
    var key = "1234"
    dbPersons.doc(app.globalData.personid).update({
      data:{
        ["subscribe."+key]:{accept:true}
      }
    })
  },

  dbRead(){
    var key = "1234"
    dbPersons.doc(app.globalData.personid).get().then(res=>{
      var accept = res.data.subscribe[key]
      console.log(accept)
    })
  },

  tapDoc: function () {
    var url= "https://docs.qq.com/doc/DVm1ITWx0V1dLVml3"
    var path = "/pages/detail/detail?url=" + url 
    console.log(path)
    wx.navigateToMiniProgram({
      appId: 'wxd45c635d754dbf59', // 腾讯文档的appID
      path: path,
      success(res) {
      }
    })
  },

  tapScan(){
    const self = this
    wx.scanCode({
      complete: (res) => {
        console.log(res)
        dbTemp.doc(app.globalData.personid).set({
          data:{
            raw: res.rawData,
            decode: self.decode(res.rawData),
            result:res.result,
          }
        })
      }
    })
  },

  tapDecode(){
    var input = "EM6goKRzABtHvCgQrBqAfzQ"
    // var input = "bG0xKUwzX2xYeWJkTWdtWmYyJnFoKThGZmc0eGpzT2c0M0NGZmc0UllSZGkx"
    // var input = "V0lGSTpUOldQQTtQOjAwNTk4OTY2NTU7UzpTdXBlck1hcF9HdWVzdDs="
    var output = this.decode(input)
    console.log(output)
  },

  encode: function (input) {
    var _keyStr= "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
    var output = "";
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;
    input = this._utf8_encode(input);

    while (i < input.length) {
      chr1 = input.charCodeAt(i++);
      chr2 = input.charCodeAt(i++);
      chr3 = input.charCodeAt(i++);

      enc1 = chr1 >> 2;
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      enc4 = chr3 & 63;

      if (isNaN(chr2)) {
        enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
        enc4 = 64;
      }

      output = output + _keyStr.charAt(enc1) + _keyStr.charAt(enc2) + _keyStr.charAt(enc3) + _keyStr.charAt(enc4);
    }
    return output;
  },

  decode: function (input) {
    var _keyStr= "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
    var output = "";
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;

    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
    while (i < input.length) {
      enc1 = _keyStr.indexOf(input.charAt(i++));
      enc2 = _keyStr.indexOf(input.charAt(i++));
      enc3 = _keyStr.indexOf(input.charAt(i++));
      enc4 = _keyStr.indexOf(input.charAt(i++));

      chr1 = (enc1 << 2) | (enc2 >> 4);
      chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      chr3 = ((enc3 & 3) << 6) | enc4;

      output = output + String.fromCharCode(chr1);

      if (enc3 != 64) {
        output = output + String.fromCharCode(chr2);
      }
      if (enc4 != 64) {
        output = output + String.fromCharCode(chr3);
      }
    }

    output = this._utf8_decode(output);
    return output;
  },

  _utf8_encode: function (string) {

    string = string.replace(/\r\n/g, "\n");

    var utftext = "";



    for (var n = 0; n < string.length; n++) {



      var c = string.charCodeAt(n);



      if (c < 128) {

        utftext += String.fromCharCode(c);

      } else if ((c > 127) && (c < 2048)) {

        utftext += String.fromCharCode((c >> 6) | 192);

        utftext += String.fromCharCode((c & 63) | 128);

      } else {

        utftext += String.fromCharCode((c >> 12) | 224);

        utftext += String.fromCharCode(((c >> 6) & 63) | 128);

        utftext += String.fromCharCode((c & 63) | 128);

      }



    }



    return utftext;

  },



  // private method for UTF-8 decoding

  _utf8_decode: function (utftext) {

    var string = "";

    var i = 0;

    var c = 0;

    var c1 = 0;

    var c2 = 0;



    while (i < utftext.length) {



      c = utftext.charCodeAt(i);



      if (c < 128) {

        string += String.fromCharCode(c);

        i++;

      } else if ((c > 191) && (c < 224)) {

        c = utftext.charCodeAt(i + 1);

        string += String.fromCharCode(((c & 31) << 6) | (c1 & 63));

        i += 2;

      } else {

        c1 = utftext.charCodeAt(i + 1);

        c2 = utftext.charCodeAt(i + 2);

        string += String.fromCharCode(((c & 15) << 12) | ((c1 & 63) << 6) | (c2 & 63));

        i += 3;

      }



    }
  return string;
  },

  tapCreateQrcode(){
    var qrcode = new QRCode('canvas', {
      // usingIn: this,
      text: "https://github.com/tomfriwel/weapp-qrcode",
      width: 128,
      height: 128,
      colorDark: "#1CA4FC",
      colorLight: "white",
      correctLevel: QRCode.CorrectLevel.H,
    });
    qrcode.makeCode("test")
    wx.showActionSheet({
      itemList: ['保存图片'],
      success: function (res) {
        console.log(res.tapIndex)
        if (res.tapIndex == 0) {
          qrcode.exportImage(function (path) {
            wx.saveImageToPhotosAlbum({
              filePath: path,
            })
          })
        }
      }
    })
  },


});