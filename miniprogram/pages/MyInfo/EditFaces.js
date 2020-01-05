const app = getApp()
const util = require('../../utils/util.js')
const odtools = require('../../utils/odtools.js')
const outdoor = require('../../utils/outdoor.js')
// const template = require('../../utils/template.js')
const cloudfun = require('../../utils/cloudfun.js')
const person = require('../../utils/person.js')
const promisify = require('../../utils/promisify.js')
const facetools = require('../../utils/facetools.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
const dbPersons = db.collection('Persons')
const _ = db.command

Page({

  data: {
    facecodes:{}, 
  },

  onShow() {
    this.setData({
      size: app.globalData.setting.size
    })
  },

  async onLoad(options) {
    let res = await dbPersons.doc(app.globalData.personid).get()
    this.setData({
      facecodes: res.data.facecodes?res.data.facecodes:{}
    })
    this.buildFaceFun()
  },

  buildFaceFun() {
    for (var id in this.data.facecodes) {
      this["deleteFace" + id] = (e) => {
        this.deleteFace(e,id)
      }
    }
  },

  async deleteFace(e,fid) {
    console.log("LookPhotos.managerMyFaces()")
    // template.savePersonFormid(app.globalData.personid, e.detail.formId)

    let res = await promisify.showModal({
      title:"确认删除",
      content:"删除后无法恢复，只能从活动照片页面重新上传照片"
    })
    if (res.confirm) {
      const facecode = this.data.facecodes[fid]
      wx.cloud.deleteFile({
        fileList: [facecode.src]
      })
      await cloudfun.opPersonItem(app.globalData.personid, "facecodes", null, "remove")
      this.setData({
        facecodes: this.data.facecodes
      })
    }
  },

  onUnload: function () {

  },

})