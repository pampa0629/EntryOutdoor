const app = getApp()

const odtools = require('./odtools.js')
const util = require('./util.js')
const template = require('./template.js')
const cloudfun = require('./cloudfun.js')
const lvyeorg = require('./lvyeorg.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
const dbPersons = db.collection('Persons')
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
    wayPoints: [],
    trackFiles: [],
  }
  this.meets = [] //集合点，可加多个
  this.traffic = {} // 交通方式
  this.members = [] // 已报名成员（含领队）
  this.addMembers = [] // 未通过小程序报名，领队添加的“附加队员”
  this.brief = { // 活动简要介绍，分为文字和图片（多张）
    disc: "领队有点懒，什么也没介绍",
    pics: [], // {src:string} 云存储路径
  }
  this.limits = { // 领队设置的活动限定条件
    disclaimer: "", //免责条款
    allowPopup: false, // 是否允许空降
    maxPerson: false, // 是否限制人数
  }
  this.leader = {} // 领队，save时确定，或者领队转让时修改
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
      this.postWaitings()

      // 移除占坑过期队员
      this.removeOcuppy(() => {
        console.log(this)
        if (callback) {
          callback(this)
        }
      })
    })
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
  this.addMembers = od.addMembers ? od.addMembers : this.addMembers
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
  } else { // 新格式直接设置
    this.route = od.route ? od.route : this.route
  }
  this.route.wayPoints = this.route.wayPoints ? this.route.wayPoints : [] // 防止为空
  this.route.trackFiles = this.route.trackFiles ? this.route.trackFiles : [] // 轨迹文件

  this.chat = od.chat ? od.chat : this.chat
  this.QcCode = od.QcCode
  this.pay = od.pay ? od.pay : this.pay

  // next 

}

// 把当前活动设置为可供后续创建新活动的样子，即把活动id、活动日期、队员列表、网站同步信息、活动状态等信息置空
OD.prototype.setDefault4New = function() {
  console.log("OD.prototype.setDefault4New()")
  this.outdoorid = null
  this.title.date = null
  this.members = []
  this.websites = odtools.getDefaultWebsites()
  this.status = "拟定中"
}

// 保存（更新）od到数据库中，若之前没有保存过，则新建一条记录
// myself：自己的报名信息
// modifys: 修改了哪些项目
// callback: 返回活动本身
OD.prototype.save = function(myself, modifys, callback) {
  console.log("OD.prototype.save()")
  console.log("outdoorid:" + this.outdoorid)
  const self = this
  if (this.outdoorid) {
    // 必须先刷新一下成员，不然容易覆盖
    dbOutdoors.doc(self.outdoorid).get().then(res => {
      self.members = res.data.members
      // 找到自己的index，并更新信息
      self.members.forEach((item, index) => {
        if (item.personid == myself.personid) {
          self.members[index] = myself // 不能用item设置，大坑
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
  this.postWaitings()
  // 修改的内容同步到网站上
  this.postModify2Websites(modifys)
  this.sendModify2Members(modifys)
}

// 发布活动
// 返回活动本身
OD.prototype.publish = function(leader, callback) {
  const self = this
  // 保存到数据库中
  this.leader = leader
  this.save(leader, {}, res => {
    // 对于需要同步网站的，生成 tid
    self.ensureWebsites()
    if (callback) {
      callback(res)
    }
  })
}

// 删除活动，删除后不得再调用任何内容
// 返回被清空后的活动内容
OD.prototype.del = function(callback) {
  console.log("OD.prototype.del()")
  console.log("outdoorid:" + this.outdoorid)
  const self = this
  dbOutdoors.doc(this.outdoorid).remove()
    .then(res => {
      self.clear() // 清空内容
      self.outdoorid = null // id设置为null
      if (callback) {
        callback(self)
      }
    })
}

// 清空活动内容
OD.prototype.clear = function(callback) {
  console.log("OD.prototype.clear()")
  console.log("outdoorid:" + this.outdoorid)
  this.deleteClouds() // 删除云存储上的内容
  var temp = this.outdoorid
  var empty = new OD()
  for (var key in empty) { // 彻底清空内存
    this[key] = empty[key]
  }
  this.outdoorid = temp
}

// 删除云存储上的内容，主要是照片和轨迹文件
OD.prototype.deleteClouds = function() {
  console.log("OD.prototype.deleteClouds()")
  var dels = []
  for (var i in this.brief.pics) {
    dels.push(this.brief.pics[i].src)
  }
  for (var i in this.brief.trackFiles) {
    dels.push(this.brief.trackFiles[i].src)
  }

  wx.cloud.deleteFile({
    fileList: dels
  }).then(res => {
    console.log(res)
  }).catch(err => {
    console.log(err)
  })
}

// 以当前活动od为模板，创建新活动；leader是领队信息 
// callback 返回活动id
OD.prototype.create = function(leader, callback) {
  console.log("OD.prototype.create()")
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
          leader: leader, // 写入领队信息 
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
  console.log(this.brief.pics)
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
        }).catch(err => {
          console.log(err)
        })
      }).catch(err => {
        console.log(err)
      })
    }
  })
}

// 复制轨迹文件
OD.prototype.copyTrackFiles = function() {
  console.log("OD.prototype.copyTrackFiles()")
  console.log(this.route.trackFiles)
  if (this.route.trackFiles) {
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
          }).catch(err => {
            console.log(err)
          })
        }).catch(err => {
          console.log(err)
        })
      }
    })
  }
}

// 保存某个子项
// name：子项的名字，内部自动匹配
OD.prototype.saveItem = function(name, callback) {
  console.log("OD.prototype.saveItem()" + name)
  console.log("outdoorid: " + this.outdoorid)
  var value = util.getValue(this, name)
  console.log(value)
  // 存储到数据库中
  wx.cloud.callFunction({
    name: 'dbSimpleUpdate', // 云函数名称
    // table,id,item,command(push,pop,shift,unshift,""),value
    data: {
      table: "Outdoors",
      id: this.outdoorid,
      item: name,
      command: "",
      value: value
    }
  }).then(res => {
    console.log(res)

    var modifys = {} // 提取修改的第一级子项的名字
    modifys[name.split(".")[0]] = true
    console.log(modifys)
    // 一些重要的基本信息被修改，需要通知到所有已报名队员
    this.sendModify2Members(modifys)
    // 同步到网站
    this.postModify2Websites(modifys)

    wx.showToast({
      title: '保存成功',
    })
    if (callback) {
      callback()
    }
  }).catch(err => {
    console.log(err)
  })
}

// 一些重要的基本信息被修改，需要通知到所有已报名队员
OD.prototype.sendModify2Members = function(modifys) {
  console.log("OD.prototype.sendModify2Members()")
  console.log(modifys)
  // 只有活动标题和集合地点内容修改，才发通知给队员
  if (modifys.title || modifys.meets) {
    if (this.status == "已发布" || this.status == "已成行") {
      this.members.forEach((item, index) => {
        template.sendModifyMsg2Member(item.personid, this.outdoorid, this.title.whole, this.leader.userInfo.nickName, modifys)
      })
    }
  }
}

// 报名。若已经存在，则更新状态；若不存在，则添加到最后
// callback 返回报名状态 status，以及是否属于新增加报名
OD.prototype.entry = function(member, callback) {
  console.log("OD.prototype.entry()")
  const self = this
  // 第一步，刷新members，防止之前已经有人报名了
  dbOutdoors.doc(self.outdoorid).get().then(res => {
    self.members = res.data.members
    self.addMembers = res.data.addMembers ? res.data.addMembers : [] // 防止为null

    // 第二步，判断是更新报名信息，还是新报名
    var findSelf = false
    self.members.forEach((item, index) => {
      if (item.personid == member.personid) {
        self.members[index] = member // 找到自己的index，就更新信息
        findSelf = true
      }
    })

    // 第三步，新报名，则需要判断是否属于替补
    if (!findSelf) {
      if (self.limits.maxPerson && (self.members.length + self.addMembers.length >= self.limits.personCount)) {
        member.entryInfo.status = "替补中"
      }
      self.members.push(member)
    }

    // 更新Outdoors数据库
    cloudfun.updateOutdoorItem(self.outdoorid, "members", self.members)
    // 报名信息同步到网站
    this.postEntry2Websites(member, false, false)
    if (callback) { // 即时返回，无需等到写入数据库中
      callback({
        status: member.entryInfo.status,
        entry: !findSelf
      })
    }
  })
}

// 为附加队员报名 
// callback 成功返回success和附加队员名单；失败返回failed
OD.prototype.entry4Add = function(addMember, callback) {
  console.log("OD.prototype.entry4Add()")
  const self = this
  // 第一步，刷新members，防止之前已经有人报名了
  dbOutdoors.doc(self.outdoorid).get().then(res => {
    self.members = res.data.members
    self.addMembers = res.data.addMembers ? res.data.addMembers : [] // 防止为null

    // 第二步，看看是否人员已满，附加队员无法替补
    if (self.limits.maxPerson && (self.members.length + self.addMembers.length >= self.limits.personCount)) {
      // 人满了就只能直接返回
      if (callback) {
        callback({
          failed: true
        })
      }
    } else {
      self.addMembers.push(addMember)

      // 更新Outdoors数据库
      cloudfun.updateOutdoorItem(self.outdoorid, "addMembers", self.addMembers)
      // 构造一个假的member
      var member = {
        entryInfo: {
          status: "报名中",
          meetsIndex: "不定"
        },
        userInfo: {
          nickName: addMember,
          phone: "",
          gender: "不明"
        }
      }
      // 报名信息同步到网站
      this.postEntry2Websites(member, false, false)
      if (callback) { // 即时返回，无需等到写入数据库中
        callback({
          success: true,
          addMembers: self.addMembers
        })
      }
    }
  })
}

// 附加队员退出
// index：指定index的附加队员退出
OD.prototype.quit4Add = function(index) {
  console.log("OD.prototype.quit4Add()")
  // 判断index范围
  if (index >= 0 && index < this.addMembers.length) {

    // 看是否会导致替补队员转正
    var bench = this.firstBench2Member()
    // 写入数据库 
    if (bench) {
      cloudfun.updateOutdoorItem(this.outdoorid, "members", this.members)
    }

    var delName = this.addMembers.splice(index, 1)[0]
    cloudfun.updateOutdoorItem(this.outdoorid, "addMembers", this.addMembers)

    // 同步到网站
    // 构造一个假的member
    var member = {
      entryInfo: {},
      userInfo: {
        nickName: delName
      }
    }
    // 报名信息同步到网站
    this.postEntry2Websites(member, true, false)
  }
}

// 排位第一的替补转正
// 信息同步到网站，并发送微信消息；但不负责保存到数据库
// 发生返回true
OD.prototype.firstBench2Member = function() {
  console.log("OD.prototype.firstBench2Member()")
  if (this.limits.maxPerson && (this.members.length + this.addMembers.length > this.limits.personCount)) {
    for (var i in this.members) {
      if (this.members[i].entryInfo.status == "替补中") {
        this.members[i].entryInfo.status = "报名中"
        // 给退出者发消息
        template.sendEntryMsg2Bench(this.members[i].personid, this.outdoorid, this.title.whole, this.members[i].userInfo.nickName)
        this.postEntry2Websites(this.members[i], false, false)
        return true // 仅限一位
      }
    }
  }
  return false
}

// 退出报名（正式队员）
// personid: 退出者id
// selfQuit：是否为自行退出（false则为领队强制退出）
// callback 返回 剩余的队员数组
OD.prototype.quit = function(personid, selfQuit, callback) {
  console.log("OD.prototype.quit()")
  // 第一步：刷新重要信息
  dbOutdoors.doc(this.outdoorid).get().then(res => {
    this.members = res.data.members
    this.addMembers = res.data.addMembers ? res.data.addMembers : []
    this.limits = res.data.limits

    // 第二步：找到自己
    var index = util.findIndex(this.members, "personid", personid)
    if (index >= 0) {
      var member = this.members[index]

      // 第三步：判断是否能让替补上；原则：我不是替补，我退出，就让第一个替补顶上
      if (member.entryInfo.status != "替补中") {
        this.firstBench2Member()
      }

      this.members.splice(index, 1) // 别忘了删除自己
      // 第四步：新成员列表写入数据库
      cloudfun.updateOutdoorItem(this.outdoorid, "members", this.members)

      // 第五步：给退出者发消息
      if (selfQuit) {
        var remark = "您已自行退出本次活动。您仍可以点击进入小程序继续报名。"
        template.sendQuitMsg2Self(member.personid, this.outdoorid, this.title.whole, this.title.date, this.leader.userInfo.nickName, member.userInfo.nickName, remark)
      } else {
        var remark = "您已被领队驳回报名，可点击回到活动的“留言”页面中查看原因。若仍有意参加，可在留言中@领队或电话等方式联系领队确认情况。"
        // 发模板消息
        template.sendRejectMsg2Member(member.personid, this.title.whole, this.outdoorid, this.leader.userInfo.nickName, this.leader.userInfo.phone, remark)
      }

      // 第六步：同步到网站
      this.postEntry2Websites(member, true, selfQuit)
      // 第七步：回调
      if (callback) {
        callback(this.members)
      }
    }
  })
}

//////////////////  户外网站处理 start  /////////////////////////////////////////////

// 确保网站已经同步，并有了tid（帖子id）
OD.prototype.ensureWebsites = function(callback) {
  console.log("OD.prototype.ensureWebsites()")
  const lvyeobj = this.websites.lvyeorg // 当前只对接了lvye org网址
  console.log(lvyeobj)
  // 第一步，得有要求同步才行，并且还得登录网址了
  if (lvyeobj.keepSame && app.globalData.lvyeorgLogin) {
    // 第二步，判断是否已经发帖; 已发布和已成行的活动，尚未发帖，则应立即发帖
    if (!lvyeobj.tid && (this.status == "已发布" || this.status == "已成行")) {
      lvyeorg.addThread(this.outdoorid, this, lvyeobj.isTesting || this.limits.isTest, tid => {
        if (tid && callback) {
          lvyeobj.tid = tid
          callback(tid)
        }
      })
    } else if (lvyeobj.tid && callback) {
      callback(lvyeobj.tid)
    }
  }
}

// 判断处理websites中的信息，主要就是把信息同步到网站
OD.prototype.postWaitings = function() {
  console.log("OD.prototype.postWaitings()")
  const lvyeobj = this.websites.lvyeorg // 当前只对接了lvye org网址
  console.log(lvyeobj)
  // 得有要求同步才行，并且还得登录网址了
  if (lvyeobj.keepSame && app.globalData.lvyeorgLogin) {
    // 必须已经发帖，再看看是否有waitings需要推送
    // 若之前没有发帖成功，则现在发帖
    this.ensureWebsites(tid => {
      console.log(tid)
      if (tid && lvyeobj.waitings && lvyeobj.waitings.length > 0) {
        lvyeorg.postWaitings(lvyeobj.tid, lvyeobj.waitings, callback => {
          cloudfun.clearOutdoorLvyeWaitings(this.outdoorid, callback => {
            lvyeobj.waitings = []
          })
        })
      }
    })
  }
}

// 把修改信息同步到网站
OD.prototype.postModify2Websites = function(modifys) {
  console.log("OD.prototype.postModify2Websites()")
  console.log(modifys)
  const lvyeobj = this.websites.lvyeorg
  if (lvyeobj.keepSame) {
    var addedMessage = "领队对以下内容作了更新，请报名者留意！"
    var message = lvyeorg.buildOutdoorMesage(this, false, modifys, addedMessage, this.websites.lvyeorg.allowSiteEntry) // 构建活动信息

    this.postMessage2Websites(addedMessage, addedMessage + message)
  }
}

// 同步信息到网站
OD.prototype.postMessage2Websites = function(title, message) {
  console.log("OD.prototype.postMessage2Websites()")
  const lvyeobj = this.websites.lvyeorg
  if (lvyeobj.keepSame) {
    // 登录了，且有tid了，就直接跟帖报名
    if (lvyeobj.tid && app.globalData.lvyeorgLogin) {
      lvyeorg.postMessage(this.outdoorid, this.websites.lvyeorg.tid, title, message)
    } else { // 没有登录，或者tid还没有，则记录到waitings中
      lvyeorg.add2Waitings(this.outdoorid, message)
    }
  }
}

// 报名信息同步到网站
// member：要报名的队员信息，
// isQuit：是否为退出；
// selfQuit ：是否为自行退出；false时为领队强制清退
OD.prototype.postEntry2Websites = function(member, isQuit, selfQuit) {
  const lvyeobj = this.websites.lvyeorg
  // 先确定是否要同步
  if (lvyeobj.keepSame) {
    // 构建报名信息
    var entryMessage = lvyeorg.buildEntryMessage(member.userInfo, member.entryInfo, isQuit, selfQuit, false)
    var entryNotice = lvyeorg.buildEntryNotice(lvyeobj.qrcodeUrl, false, lvyeobj.allowSiteEntry)
    entryMessage.message += entryNotice

    this.postMessage2Websites(entryMessage.title, entryMessage.message)
  }
}

//////////////////  户外网站处理 end  /////////////////////////////////////////////


module.exports = {
  OD: OD,
  load: OD.prototype.load,
  save: OD.prototype.save,
  publish: OD.prototype.publish,
  del: OD.prototype.del,
  clear: OD.prototype.clear,
  saveItem: OD.prototype.saveItem,
  setDefault4New: OD.prototype.setDefault4New,
  entry: OD.prototype.entry,
  quit: OD.prototype.quit,
  entry4Add: OD.prototype.entry4Add, // 为附加队员报名
  quit4Add: OD.prototype.quit4Add, // 附加队员退出

  // 以下为内部函数，外面不得调用
  // create: OD.prototype.create, // save内部判断处理
  // postWaitings: OD.prototype.postWaitings,
  // removeOcuppy:OD.prototype.removeOcuppy,
  // copyPics:OD.prototype.copyPics,
  // copyTrackFiles:OD.prototype.copyTrackFiles,
}