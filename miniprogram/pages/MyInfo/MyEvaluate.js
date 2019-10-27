const app = getApp()

const db = wx.cloud.database({})
const dbPersons = db.collection('Persons')
const _ = db.command

Page({

  data: {
    evaluation: { 
      level: null,
      campEquipment: false,
      campExperience: false,
    },
    Questions: [{
        question: "您是否有过户外运动的经历，即无补给的爬山和较长距离徒步等？",
        answers: ["有过", "没有"],
        show: false,
        nexts: [1, 3]
      },
      {
        question: "您是否具备户外扎营过夜的装备（如帐篷睡袋等）和经历？",
        answers: ["有装备、有经历", "有装备、无经历", "无装备、有经历", "无装备、无经历"],
        show: false,
        nexts: [2, 2, 2, 2]
      },
      {
        question: "您在最近一年内，一日内走完的最长路线和累计上升是？",
        answers: ["距离5公里，累计上升500米", "距离10公里，累计上升1000米", "距离15公里，累计上升1500米", "距离20公里，累计上升2000米"],
        show: false,
        nexts: [-1, -1, -1, -1],
        levels: ["1.0", "1.5", "2.0", "2.5"]
      },
      {
        question: "您平时是否进行一定强度的运动，如跑步/健身/游泳/篮球/足球等？",
        answers: ["有", "没有"],
        show: false,
        nexts: [4, 5]
      },
      {
        question: "您平时是否进行一定强度的运动，如跑步/健身/游泳/篮球/足球等？一周平均几次？",
        answers: ["有，一周两次以上", "有，一周一到两次", "有，一周不到一次", "没有"],
        show: false,
        nexts: [-1, -1, 5, 5],
        levels: ["1.5", "1.0"]
      },
      {
        question: "您能否爬楼梯上六楼，中间是否需要休息？",
        answers: ["打死也不自己爬楼", "多休息几次还是能爬上去", "可以坚持不休息", "很轻松，干嘛要休息"],
        show: false,
        nexts: [-1, -1, -1, -1],
        levels: ["0.1", "0.5", "0.8", "1.0"]
      }
    ],
  },

  onShow() {
    this.setData({
      size: app.globalData.setting.size
    })
  },
  
  async onLoad(options) {
    console.log("onLoad()", options)
    for (var i = 0; i < this.data.Questions.length; i++) {
      let index = i
      this["clickAnsweer" + index] = (e) => {
        this.clickAnsweer(index, e)
      }
      this["changeAnswer" + index] = (e) => {
        this.changeAnswer(index, e)
      }
      this["clickNext" + index] = () => {
        this.clickNext(index)
      }
    }

    // 读取数据库
    if (app.checkLogin()) {
      let res = await dbPersons.doc(app.globalData.personid).get()
      if (res.data.career) {
        this.setData({
          evaluation: res.data.career.evaluation
        })
      }
      console.log(this.data.evaluation)
      if (!this.data.evaluation) { // 没有记录，则自动重新测评
        this.evaluateAgain()
      }
    }
  },

  onUnload: function() {
    const self = this;
    let pages = getCurrentPages();
    let prevPage = pages[pages.length - 2];
    prevPage.setData({
      "career.evaluation": self.data.evaluation,
    })
  },

  changeAnswer: function(index, e) {
    console.log(index)
    console.log(e.detail)
    this.setData({
      ["Questions[" + index + "].select"]: e.detail,
    })
  },

  clickAnsweer: function(index, e) {
    console.log(index)
    console.log(e.target.dataset.name)
    this.setData({
      ["Questions[" + index + "].select"]: e.target.dataset.name.toString(),
    })
  },

  clickNext(i) {
    console.log(i)
    const self = this
    // 先全部不可见
    self.data.Questions.forEach((item, index) => {
      self.setData({
        ["Questions[" + index + "].show"]: false,
      })
    })
    // 再设置下一道题可见
    var nextQ = self.data.Questions[i].nexts[self.data.Questions[i].select]
    if (nextQ >= 0) {
      self.setData({
        ["Questions[" + nextQ + "].show"]: true,
      })
    } else { // 到头了，得给出结论
      self.setData({ // 体力情况
        "evaluation.level": self.data.Questions[i].levels[self.data.Questions[i].select]
      })
      // 扎营与否
      var campEquipment = false
      var campExperience = false
      if (self.data.Questions[1].select == 0) {
        campEquipment = true
        campExperience = true
      } else if (self.data.Questions[1].select == 1) {
        campEquipment = true
      } else if (self.data.Questions[1].select == 2) {
        campExperience = true
      }
      self.setData({ // 体力情况
        "evaluation.campEquipment": campEquipment,
        "evaluation.campExperience": campExperience,
      })
      console.log("扎营情况：" + self.data.Questions[2].select)
      console.log(self.data.evaluation)
      // 写到个人数据库中
      if (app.globalData.personid) {
        dbPersons.doc(app.globalData.personid).update({
          data: {
            "career.evaluation": _.set(self.data.evaluation)
          }
        })
      }
    }
  },

  // 重新测评
  evaluateAgain() {
    console.log("evaluateAgain()")
    // 设置null
    this.setData({
      evaluation: null
    })

    // 设置第一题可见
    this.setData({
      ["Questions[" + 0 + "].show"]: true,
    })
    console.log(this.data.Questions)
  },

})