// module.exports = (api) => {
//   return (options, ...params) => {
//     return new Promise((resolve, reject) => {
//       api(Object.assign({}, options, { success: resolve, fail: reject }), ...params);
//     });
//   }
// } 

const promise=(api) => {
  return (options, ...params) => {
    return new Promise((resolve, reject) => {
      api(Object.assign({}, options, { success: resolve, fail: reject }), ...params);
    });
  }
} 

module.exports = {
  promise:promise,

  // abcd
  authorize: promise(wx.authorize),
  chooseImage: promise(wx.chooseImage),
  chooseLocation: promise(wx.chooseLocation),
  canvasToTempFilePath: promise(wx.canvasToTempFilePath),

  // efg
  getLocation: promise(wx.getLocation),
  getSetting: promise(wx.getSetting),
  getWeRunData: promise(wx.getWeRunData),

  // hijklmn
  login: promise(wx.login),
  
  
  // opqrst
  openSetting: promise(wx.openSetting),
  request: promise(wx.request),
  saveImageToPhotosAlbum: promise(wx.saveImageToPhotosAlbum),
  showModal: promise(wx.showModal),
  

  // uvwxyz
  uploadFile: promise(wx.uploadFile),

}

