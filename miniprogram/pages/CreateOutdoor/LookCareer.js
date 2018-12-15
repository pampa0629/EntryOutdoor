wx.cloud.init()
const db = wx.cloud.database({})
const dbPersons = db.collection('Persons')
const _ = db.command

Page({

  data: {
    career:null,
    myOutdoors:null,
    entriedOutdoors:null,
  },

  onLoad: function (options) {
    console.log(options)
    const self = this
    dbPersons.doc(options.personid).get().then(res=>{
      self.setData({
        career:res.data.career,
        myOutdoors: res.data.myOutdoors,
        entriedOutdoors: res.data.entriedOutdoors,
      })
    })
  },


})