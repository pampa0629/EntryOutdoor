module.exports = (api) => {
  return (options, ...params) => {
    return new Promise((resolve, reject) => {
      api(Object.assign({}, options, { success: resolve, fail: reject }), ...params);
    });
  }
} 

const promisify=(api) => {
  return (options, ...params) => {
    return new Promise((resolve, reject) => {
      api(Object.assign({}, options, { success: resolve, fail: reject }), ...params);
    });
  }
} 

module.exports = {
  // abcd
  authorize:promisify(wx.authorize),
  chooseImage: promisify(wx.chooseImage),
  chooseLocation:promisify(wx.chooseLocation),
  canvasToTempFilePath:promisify(wx.canvasToTempFilePath),

  // efg
  getLocation: promisify(wx.getLocation),
  getSetting: promisify(wx.getSetting),
  getWeRunData:promisify(wx.getWeRunData),

  // hijklmn
  login: promisify(wx.login),
  
  
  // opqrst
  openSetting:promisify(wx.openSetting),
  request: promisify(wx.request),
  saveImageToPhotosAlbum:promisify(wx.saveImageToPhotosAlbum),
  showModal:promisify(wx.showModal),
  

  // uvwxyz
  uploadFile: promisify(wx.uploadFile),

}

