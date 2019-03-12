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
        myOutdoors: res.data.myOutdoors,
        entriedOutdoors: res.data.entriedOutdoors,
      })
      if (res.data.career) {
        self.setData({
          career: res.data.career,
        })
      }
      
      for (var i = 0; i < res.data.myOutdoors.length; i++) {
        let index = i; // 还必须用let才行
        this["clickMy" + index] = (e) => {
          self.clickMy(index, e)
        }
      }
      for (var i = 0; i < res.data.entriedOutdoors.length; i++) {
        let index = i; // 还必须用let才行
        this["clickEntried" + index] = (e) => {
          self.clickEntried(index, e)
        }
      }
    })
  },

  clickMy(index, e) {
    this.gotoOutdoor(this.data.myOutdoors[index].id)
  },

  clickEntried(index, e) {
    this.gotoOutdoor(this.data.entriedOutdoors[index].id)
  },

  gotoOutdoor (outdoorid) {
    console.log(outdoorid)
    wx.navigateTo({
      url: '../EntryOutdoor/EntryOutdoor?outdoorid='+outdoorid,
    })
  },


})