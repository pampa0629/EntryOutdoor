const app = getApp()
const util = require('../../utils/util.js')
// const template = require('../../utils/template.js')

Page({

  data: {
    outdoorid:null,
    //活动路线，可加多个途经点和轨迹文件
    route: {
      wayPoints: [], // 途经点
      trackFiles: [], // 轨迹文件 
      trackSites: [], // 轨迹网站
    }, 
  
    index: 0, // 当前要处理的index
    hasModified: false,
    size: app.globalData.setting.size, // 界面大小

    showAction: false,
    Actions: [{
        name: '编辑',
        subname: "编辑当前途经点"
      },
      {
        name: '删除',
        subname: "删除当前途经点"
      },
      {
        name: '追加(前面)',
        subname: "在前面追加途经点"
      },
      {
        name: '追加(后面)',
        subname: "在后面追加途经点"
      },
    ],
  },

  onCancelAction() {
    this.setData({
      showAction: false
    });
  },

  onSelectAction(e) {
    console.log(e);
    const self = this
    if (e.detail.name == "删除") {
      self.data.route.wayPoints.splice(self.data.index, 1)
      this.setData({
        "route.wayPoints": self.data.route.wayPoints,
        hasModified: true,
      })
    } else {
      var url = "EditOneStop?index=" + this.data.index + "&action="
      if (e.detail.name == "编辑") {
        url += "edit"
      } else if (e.detail.name == "追加(前面)") {
        url += "addBefore"
      } else if (e.detail.name == "追加(后面)") {
        url += "addAfter"
      }
      wx.navigateTo({
        url: url,
      })
    }
    this.setData({
      showAction: false
    });
  },

  // 弹出选项：在前面追加，在后面追加，编辑，删除
  clickStop: function(index, e) {
    console.log(index) // 这里知道要处理哪个集合点
    this.setData({
      index: index,
      showAction: true,
    });
  },

  onShow() {
    this.setData({
      size: app.globalData.setting.size
    })
  },

  onLoad: function(options) {
    console.log("onLoad()")
    const self = this;
    let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    let prevPage = pages[pages.length - 2];
    self.setData({
      route: prevPage.data.od.route,
      outdoorid: prevPage.data.od.outdoorid,
      od: prevPage.data.od,
    })
    if(!self.data.route.wayPoints) {
      self.setData({
        "route.wayPoints": [],
        hasModified: true,
      })
    }
    console.log("route: ")
    console.log(self.data.route)
    self.rebuildClickStopFun()

    if (!self.data.route.trackSites) {
      // 轨迹网站 { name: "", useit: false, trackid: null, url: null }
      self.setData({
        "route.trackSites": [{
          name: "六只脚",
          useit: false,
          url: "",
          qrcode:"",
        }, {
          name: "两步路",
          useit: false,
          url: "",
          qrcode: "",
        }],
      })
    }
    self.dealCompatibility()
    console.log(self.data.route.trackSites)
    self.rebuildSitesFun()
    self.rebuildDelFileFuntion() // 
  },

  dealCompatibility(){
    console.log("dealCompatibility()")
    const self = this
    console.log(self.data.route.trackSites)
    if (self.data.route.trackSites) {
      self.data.route.trackSites.forEach((item, index) => {
        if (item.name == "六只脚") {
          item.urlpre = "http://www.foooooot.com/trip/"
          item.urlpost = "/"
          item.qrcodepre = "http://foooooot.com/trip/"
          item.qrcodepost = "/nav_to/"
        } else if (item.name == "两步路") {
          item.urlpre = "http://www.2bulu.com/track/t-"
          item.urlpost = ".htm"
          item.qrcodepre = "http://www.2bulu.com/track/t-"
          item.qrcodepost = ".htm"
        }
      })
    }
  },

  rebuildSitesFun() {
    const self = this
    if (self.data.route && self.data.route.trackSites) {
      for (var i = 0; i < self.data.route.trackSites.length; i++) {
        let index = i
        this["checkTrackSites" + index] = () => {
          this.checkTrackSites(index)
        }
        this["changeTrackid" + index] = (e) => {
          this.changeTrackid(index, e)
        }
        this["copyinUrl" + index] = () => {
          this.copyinUrl(index)
        }
        this["copyoutUrl" + index] = () => {
          this.copyoutUrl(index)
        }
      }
    }
  },

  rebuildClickStopFun: function() {
    if (this.data.route && this.data.route.wayPoints) {
      for (var i = 0; i < this.data.route.wayPoints.length; i++) {
        // 这里动态创建给click cell的函数
        let index = i; // 还必须用let才行
        this["clickStop" + index] = (e) => {
          this.clickStop(index, e)
        }
      }
    }
  },

  onUnload: function() {
    console.log("onUnload()")
    this.save() // 自动保存
  },

  save(e) {
    console.log("save()")
    // if(e)
    //   template.savePersonFormid(app.globalData.personid, e.detail.formId, null)
    if(this.data.hasModified) {
      const self = this;
      let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
      let prevPage = pages[pages.length - 2];

      prevPage.setData({
        "od.route": self.data.route,
      })
      this.data.od.saveItem("route")

      this.setData({
        hasModified:false,
      })
    }
  },

  giveup(e) {
    console.log("giveup()")
    // template.savePersonFormid(app.globalData.personid, e.detail.formId, null)
    this.data.hasModified = false
    wx.navigateBack({})
  },

  // 调出新页面，增加途经点
  addStop: function(e) {
    // template.savePersonFormid(app.globalData.personid, e.detail.formId, null)
    wx.navigateTo({
      url: "EditOneStop?action=addLast",
    })
  },

  checkTrackSites(index) {
    console.log("checkTrackSites")
    console.log(index)
    const self = this
    self.setData({
      ["route.trackSites[" + index + "].useit"]: !self.data.route.trackSites[index].useit,
      hasModified:true,
    })
  },

  changeTrackid(index, e) {
    console.log("changeTrackid")
    console.log(index)
    console.log(e)
    const self = this
    const item = self.data.route.trackSites[index]
    self.setData({
      ["route.trackSites[" + index + "].trackid"]: e.detail,
      ["route.trackSites[" + index + "].url"]: item.urlpre + e.detail + item.urlpost,
      ["route.trackSites[" + index + "].qrcode"]: item.qrcodepre + e.detail + item.qrcodepost,
      hasModified: true,
    })
    console.log(item)
  },

  copyinUrl(index) {
    console.log("copyinUrl():", index)
    const self = this
    const sites = self.data.route.trackSites
    wx.getClipboardData({
      success: function(res) {
        console.log("getClipboardData:",res.data)
        self.setData({
          ["route.trackSites[" + index + "].url"]: res.data,
          ["route.trackSites[" + index + "].trackid"]: self.removePrePost(res.data, index),
          ["route.trackSites[" + index + "].qrcode"]: sites[index].qrcodepre + sites[index].trackid + sites[index].qrcodepost,
          hasModified: true,
        })
      }
    })
  },

  // 删除网址的前缀和后缀
  removePrePost(url, index) {
    console.log("removePrePost():", url, index)
    console.log("trackSites:", this.data.route.trackSites[index])
    var pre = this.data.route.trackSites[index].urlpre
    var post = this.data.route.trackSites[index].urlpost
    console.log(pre)
    console.log(post) 
    return url.substr(pre.length, url.length - pre.length - post.length)
  },

  copyoutUrl(index) {
    console.log("copyoutUrl")
    console.log(index)
    const self = this
    wx.setClipboardData({
      data: self.data.route.trackSites[index].url,
      success: function(res) {
        wx.showToast({
          title: '已拷贝',
        })
      }
    })
  },

  // 增加轨迹文件
  addTrackFile() {
    console.log("addTrackFile")
    const self = this
    wx.chooseMessageFile({
      count: 5,
      type: 'file',
      extension: ["gpx", "kml", "xml", "xyz", "gdb", "plt", "pdf","doc","docx","txt","zip","rar"], //轨迹文件、文档文件、压缩文件
      success(res) {
        console.log(res)
        // tempFilePath可以作为img标签的src属性显示图片
        const tempFiles = res.tempFiles
        console.log(tempFiles)
        tempFiles.forEach((item, index) => {
          if (item.size > 5000000) { // 控制每张图片不能超过5mb
            wx.showToast({
              title: '文件不能大于5mb',
            })
          } else {
            wx.showLoading({
              icon: "loading",
              title: "正在上传文件"
            })
            console.log(item.path)
            wx.cloud.uploadFile({
              cloudPath: util.buildRouteSrc(self.data.outdoorid, item.name),
              filePath: item.path, // 小程序临时文件路径
            }).then(resUpload => {
              self.data.route.trackFiles.push({
                name:item.name,
                src: resUpload.fileID,
              })
              self.setData({
                "route.trackFiles": self.data.route.trackFiles,
                hasModified: true,
              })
              self.rebuildDelFileFuntion()

            })
            wx.hideLoading()
          }
        })
      }
    })
  },

  rebuildDelFileFuntion() {
    const self = this
    // 构建删除函数
    if (self.data.route && self.data.route.trackFiles) {
      for(var i = 0; i<self.data.route.trackFiles.length; i++) {
        let j = i; // 还必须用let才行
        this["deleteTrackFile" + j] = (e) => {
          this.deleteTrackFile(j, e)
        }
      }
    }
  },

  deleteTrackFile(index) {
    console.log("deleteTrackFile")
    console.log(index)
    const self = this
    const file = self.data.route.trackFiles[index]

    wx.cloud.deleteFile({
      fileList: [file.src]
    }).then(res => {
      console.log("del track file ok: " + JSON.stringify(res, null, 2))
    }).catch(err => {
      console.error(err)
    })

    self.data.route.trackFiles.splice(index, 1)
    this.setData({
      "route.trackFiles": self.data.route.trackFiles,
      hasModified: true,
    })
  },

  // 手台频率
  changeInterphone(e) {
    console.log(e)
    const self = this
    self.setData({
      "route.interphone":e.detail,
      hasModified: true,
    }) 
    var error = false
    if (self.data.route.interphone) {
      var temps = self.data.route.interphone.split(".")
      if (temps.length != 2 || temps[0].length != 3 || temps[1].length != 3) {
        self.setData({
          interphoneErrMsg: "手台频率应为：“abc.xyz”形式",
        })
        error = true
      }
    }
    if(!error) {
      self.setData({
        interphoneErrMsg: "",
      })
    }
  },

})