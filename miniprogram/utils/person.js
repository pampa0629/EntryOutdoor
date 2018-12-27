const util = require('./util.js')
const cloudfun = require('./cloudfun.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbPersons = db.collection('Persons')

const updateWalkStep=(personid, callback)=>{
  wx.login({
    success(resLogin) {
      util.authorize("werun", "授权后才能获取步数", cb => {
        wx.getWeRunData({
          success(res) {
            const encryptedData = res.encryptedData
            cloudfun.decryptWeRun(res.encryptedData, res.iv, resLogin.code, run => {
              console.log(run)
              var step = {}
              var date = new Date()
              date.setTime(run.watermark.timestamp * 1000)
              step.update = date.toLocaleDateString()
              var steps = []
              run.stepInfoList.forEach((item, index) => {
                steps.push(parseInt(item.step))
              })
              var tops = util.stepsTopNs(steps, [7, 30])
              step.topLast7 = tops[0]
              step.topLast30 = tops[1]
              dbPersons.doc(personid).update({
                data: {
                  "career.step": step,
                }
              })
              if (callback) {
                callback(step)
              }
            })
          }
        })
      })
    }
  })
}

module.exports = {
  // 更新步数
  updateWalkStep: updateWalkStep, 
}