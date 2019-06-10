const app = getApp()

const odtools = require('./odtools.js')
const util = require('./util.js')
const template = require('./template.js')
const cloudfun = require('./cloudfun.js')
const lvyeorg = require('./lvyeorg.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
const _ = db.command

// 创建函数，使用者必须： var od = new outdoor.OD() 来获得活动对象，并设置默认值
// 内存中的对象，为最新格式，和界面表现内容； 从数据库中load时，应注意做兼容性处理
function OD() {
  this.outdoorid = ""
  this.title = { // 活动标题，通过下面子项随时自动生成；
    whole: "", // 自动生成，也存起来
    place: "", // String; 地点描述。必填
    date: "", //必填。util.formatDate(util.nextDate(new Date(), 5)), //Date; 活动日期，能自动判断出：周六/周日/非周末; 默认活动日期为：当天的五天后
    during: "一日", // 默认为一日活动
    // duringIndex: 0, // +1 为活动天数
    loaded: "轻装", // 枚举型：轻装、重装、休闲装
    level: 1.0, //自动生成； Float，活动强度，自动计算得到，计算公式：sqrt(addedLength* addedUp/ 100)
    addedLength: 10, //Int，累积距离，单位：公里，最小值1
    addedUp: 10, //Int，累积上升，单位：百米，最小值1
    adjustLevel: 100, // 活动强度调节系数 100%意味着不调节
  }
  this.route = { // 活动路线，包括途经点和轨迹文件
    wayPoints: []
  }
  this.meets = [] //集合点，可加多个
  this.traffic = {} // 交通方式
  this.members = [] // 已报名成员（含领队）
  this.brief = { // 活动简要介绍，分为文字和图片（多张）
    disc: "领队有点懒，什么也没介绍",
    pics: [], // {src:string} 云存储路径
  }
  this.limits = { // 领队设置的活动限定条件
    disclaimer: "", //免责条款
    allowPopup: false, // 是否允许空降
    maxPerson: false, // 是否限制人数
  }
  this.status = "拟定中" // 活动本身的状态，分为：拟定中，已发布，已成行，报名截止，已取消

  // 同步到网站的信息
  this.websites = odtools.getDefaultWebsites()
}

// 根据id从数据库中装载活动内容
OD.prototype.load = function(outdoorid, callback) {
  console.log("OD.prototype.load()")
  dbOutdoors.doc(outdoorid).get()
    .then(res => {
      res.data.outdoorid = res.data._id
      this.copy(res.data) // 处理Outdoors表中数据的兼容性

      // 判断处理websites中的信息
      this.dealWebsites()

      // 移除占坑过期队员
      this.removeOcuppy(() => {
        console.log(this)
        if (callback) {
          callback(this)
        }
      })
    })
}

// 判断处理websites中的信息，主要就是把信息同步到网站
OD.prototype.dealWebsites = function () {
  const lvyeorg = this.websites.lvyeorg // 当前只对接了lvye org网址
  // 第一步，得有要求同步才行，并且还得登录网址了
  if (lvyeorg.keepSame && app.globalData.lvyeorgLogin) {
    // 第二步，判断是否已经发帖; 已发布和已成行的活动，尚未发帖，则应立即发帖
    if (!lvyeorg.tid && (this.status == "已发布" || this.status == "已成行")) { 
      lvyeorg.addThread(this.outdoorid, this, lvyeorg.isTesting || this.limits.isTest, tid => {
        lvyeorg.tid = tid
      })
    } 
    // 第三步，已经发帖的，则看看是否有waitings需要推送
    else if (lvyeorg.tid && lvyeorg.waitings.length > 0) { 
      lvyeorg.postWaitings(lvyeorg.tid, lvyeorg.waitings, callback => {
        cloudfun.clearOutdoorLvyeWaitings(this.outdoorid, callback => {
          lvyeorg.waitings = []
        })
      })
    }
    // save时，若非首次发帖，则要把更新信息跟帖 
    // todo 这个放到后面实现：活动内容每一项即时保存
  }
}

OD.prototype.removeOcuppy = function(callback) {
  // 判断处理占坑过期的问题
  if (this.title.date && odtools.calcRemainTime(this.title.date, this.limits.ocuppy, true) < 0) {
    odtools.removeOcuppy(this.outdoorid, members => {
      this.members = members
      if (callback) {
        callback()
      }
    })
  } else if (callback) {
    callback()
  }
}

// 拷贝内容
OD.prototype.copy = function(od) {
  this.outdoorid = od.outdoorid
  this.title = od.title
  this.title.adjustLevel = this.title.adjustLevel ? this.title.adjustLevel : 100
  this.meets = od.meets
  this.members = od.members
  // 设置领队，顺序：od中保存的、第一个队员、默认的（null）
  this.leader = od.leader ? od.leader : od.members[0]
  this.status = od.status

  // brief 文字加图片 
  this.brief = od.brief ? od.brief : this.brief

  //limits
  console.log("limits: ")
  console.log(od.limits)
  this.limits = od.limits ? od.limits : this.limits
  // 微信服务通知，没有的话需要取默认值
  if (!this.limits.wxnotice) {
    this.limits.wxnotice = template.getDefaultNotice()
  }

  // 几日活动，老存储：durings duringIndex
  if (!od.title.during && od.title.durings && od.title.duringIndex) {
    this.title.during = od.title.durings[od.title.duringIndex]
  }

  // 网站同步信息
  this.websites = od.websites ? od.websites : this.websites

  // 交通方式
  this.traffic = od.traffic ? od.traffic : this.traffic
  this.traffic.carInfo = odtools.buildCarInfo(this.traffic)
  this.traffic.costInfo = odtools.buildCostInfo(this.traffic)
  console.log(this.traffic)

  // 活动路线，增加轨迹文件
  if (od.route instanceof Array) { // 说明是老格式
    this.route.wayPoints = od.route ? od.route : this.route.wayPoints // 途经点
    this.route.trackFiles = null // 轨迹文件
  } else { // 新格式直接设置
    this.route = od.route ? od.route : this.route
    this.route.wayPoints = this.route.wayPoints ? this.route.wayPoints : [] // 防止为空
  }

  this.chat = od.chat ? od.chat : this.chat
  this.QcCode = od.QcCode
  this.pay = od.pay ? od.pay : this.pay

  // next 

}

// 把当前活动设置为可供后续创建新活动的样子，即把活动id、活动日期、队员列表、网站同步信息、活动状态等信息置空
OD.prototype.setDefault4New = function() {
  this.outdoorid = null
  this.title.date = null
  this.members = []
  this.websites = odtools.getDefaultWebsites()
  this.status = "拟定中"
}

// 保存（更新）od到数据库中，若之前没有保存过，则新建一条记录
// myself：自己的报名信息
// callback: 返回活动本身
OD.prototype.save = function(myself, callback) {
  const self = this
  if (self.outdoorid) {
    // 必须先刷新一下成员，不然容易覆盖
    dbOutdoors.doc(self.outdoorid).get().then(res => {
      self.members = res.data.members
      // 找到自己的index，并更新信息
      self.members.forEach((item, index) => {
        if (item.personid == myself.personid) {
          item = myself
        }
      })

      cloudfun.updateOutdoor(self.outdoorid, self, res => {
        if (callback) {
          callback(self)
        }
      })
    })
  } else { // 若之前没有保存过，则创建活动记录
    self.create(myself, id => {
      if (callback) {
        callback(self)
      }
    })
  }
  // 如果设置了与网站同步，则需要即时处理
  this.dealWebsites()
}

// 以当前活动od为模板，创建新活动；leader是领队信息 
// callback 返回活动id
OD.prototype.create = function(leader, callback) {
  dbPersons.doc(leader.personid).get()
    .then(res => {
      leader.entryInfo.status = "领队"
      // 领队有免责条款时，则用领队自己的
      if (res.data.disclaimer) {
        this.limits.disclaimer = res.data.disclaimer
      }
      var members = [leader]; // 把领队作为第一个队员
      dbOutdoors.add({ // 没有outdoor id,则新加一条记录
        data: {
          brief: this.brief,
          leader: this.leader, // 写入领队信息 
          limits: this.limits,
          meets: this.meets,
          members: members,
          route: this.route,
          status: this.status,
          title: this.title,
          traffic: this.traffic,
          websites: this.websites,
        }
      }).then(res => {
        this.outdoorid = res._id

        // 把照片和轨迹文件也复制一份给本活动
        this.copyPics()
        this.copyTrackFiles()
        
        if (callback) {
          callback(this.outdoorid)
        }
      })
    })
}

// 复制照片
OD.prototype.copyPics = function() {
  console.log("OD.prototype.copyPics()")
  this.brief.pics.forEach((item, index) => {
    // 没找到当前id，说明图片是之前活动的，则需要下载，再上传图片
    if (!item.src.match(this.outdoorid)) {
      wx.cloud.downloadFile({ // 下载先
        fileID: item.src
      }).then(res => {
        wx.cloud.uploadFile({ // 再上传到自己的活动目录下
          cloudPath: util.buildPicSrc(this.outdoorid, index),
          filePath: res.tempFilePath, // 小程序临时文件路径
        }).then(res => {
          item.src = res.fileID;
          console.log("copyPics")
          console.log(this.brief.pics)
          cloudfun.updateOutdoorBriefPics(this.outdoorid, this.brief.pics)
        })
      })
    }
  })
}

// 复制轨迹文件
OD.prototype.copyTrackFiles = function() {
  this.route.trackFiles.forEach((item, index) => {
    // 没找到当前id，说明文件是之前活动的，则需要下载，再上传
    if (!item.src.match(this.outdoorid)) {
      console.log("download src: " + item.src)
      wx.cloud.downloadFile({ // 下载先
        fileID: item.src
      }).then(res => {
        wx.cloud.uploadFile({ // 再上传到自己的活动目录下
          cloudPath: util.buildRouteSrc(this.outdoorid, item.name),
          filePath: res.tempFilePath, // 小程序临时文件路径
        }).then(res => {
          item.src = res.fileID;
          console.log("copyTrackFiles")
          console.log(this.route.trackFiles)
          cloudfun.updateOutdoorTrackFiles(this.outdoorid, this.route.trackFiles)
        })
      })
    }
  })
}

// 报名。若已经存在，则更新状态；若不存在，则添加到最后
// callback 返回报名状态 status，以及是否属于新增加报名
OD.prototype.entry = function(member, callback) {
  const self = this
  // 第一步，刷新members，防止之前已经有人报名了
  dbOutdoors.doc(self.outdoorid).get().then(res => {
    self.members = res.data.members
    // 第二步，判断是更新报名信息，还是新报名
    // 找到自己的index，就更新信息
    var findSelf = false
    self.members.forEach((item, index) => {
      if (item.personid == member.personid) {
        item = member
        findSelf = true
      }
    })
    if (!findSelf) {
      // 第三步，新报名，则需要判断是否属于替补
      if (self.limits.maxPerson && self.members.length > self.limits.personCount) {
        member.entryInfo.status = "替补中"
      }
      self.members.push(member)
    }
    // 更新Outdoors数据库
    cloudfun.updateOutdoorMembers(self.outdoorid, self.members, null)
    // 报名信息同步到网站
    this.postEntry2Websites(member, false)
    if (callback) { // 即时返回，无需等到写入数据库中
      callback({
        status: member.entryInfo.status,
        entry: !findSelf
      })
    }
  })
}

// 退出报名
// personid: 退出者id， selfQuit：是否为自行退出（false则为领队强制退出）
// callback 返回 剩余的队员数组
OD.prototype.quit = function (personid, selfQuit, callback) {
  var member = util.findObj(this.members, "personid", personid)
  odtools.removeMember(this.outdoorid, personid, selfQuit, members => {
    this.members = members
    this.postEntry2Websites(member, true)
    if (callback) {
      callback(members)
    }
  })
}

// 报名信息同步到网站
// member：要报名的队员信息，isQuit：是否为退出
OD.prototype.postEntry2Websites = function (member, isQuit) {
  const lvyeorg = this.websites.lvyeorg
  // 先确定是否要同步
  if(lvyeorg.keepSame) { 
    // 构建报名信息
    var entryMessage = lvyeorg.buildEntryMessage(member.userInfo, member.entryInfo, isQuit, false) 
    var entryNotice = lvyeorg.buildEntryNotice(lvyeorg.qrcodeUrl, false, lvyeorg.allowSiteEntry)
    entryMessage.message += entryNotice

    // 登录了，且有tid了，就直接跟帖报名
    if (lvyeorg.tid && app.globalData.lvyeorgLogin) {
      lvyeorg.postMessage(this.outdoorid, lvyeorg.tid, entryMessage.title, entryMessage.message)
    } else { // 没有登录，或者tid还没有，则记录到waitings中
      lvyeorg.add2Waitings(this.outdoorid, entryMessage.message)
    }
  }
}

module.exports = {
  OD: OD,
  load: OD.prototype.load,
  create: OD.prototype.create,
  save: OD.prototype.save,
  setDefault4New: OD.prototype.setDefault4New,
  entry: OD.prototype.entry,
  quit:OD.prototype.quit,
  
  // 以下为内部函数，外面不得调用
  // dealWebsites: OD.prototype.dealWebsites,
  // removeOcuppy:OD.prototype.removeOcuppy,
  // copyPics:OD.prototype.copyPics,
  // copyTrackFiles:OD.prototype.copyTrackFiles,
}