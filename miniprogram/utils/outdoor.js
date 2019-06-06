const odtools = require('./odtools.js')
const template = require('./template.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
const _ = db.command
 
// const obja = require('./testa.js')

// 创建函数，使用者必须： var od = new outdoor.OD() 来获得活动对象，并设置默认值
// 内存中的对象，为最新格式，和界面表现内容； 从数据库中load时，应注意做兼容性处理
function OD() {
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
    allowPopup:false, // 是否允许空降
    maxPerson:false, // 是否限制人数
  }
  this.status = "拟定中" // 活动本身的状态，分为：拟定中，已发布，已成行，报名截止，已取消

  // 同步到网站的信息
  this.websites = {
    lvyeorg: {
      //fid: null, // 版块id
      tid: null, // 帖子id
      keepSame: false, // 是否保持同步
      waitings: [], // 要同步但尚未同步的信息列表
    }
  }
}

OD.prototype.load = function(outdoorid, callback) {
  dbOutdoors.doc(outdoorid).get()
    .then(res => {
      this.copy(res.data) // 处理Outdoors表中数据的兼容性

      // checkOcuppyLimitDate() // 处理占坑截止时间过了得退坑的问题
      console.log(this)
      if(callback) {
        callback(this)
      }
    })
}

// 通过
OD.prototype.copy = function(od) {
  this.outdoorid = od._id
  this.title = od.title
  this.meets = od.meets
  this.members = od.members
  this.leader = od.members.length > 0 ? od.members[0] : this.leader
  this.status = od.status

  // brief 文字加图片 
  this.brief = od.brief ? od.brief : this.brief
  //limits
  console.log("limits: ")
  console.log(od.limits)
  this.limits = od.limits ? od.limits : this.limits
  // 微信服务通知，没有的话需要取默认值
  if ( !this.limits.wxnotice){
    this.limits.wxnotice = template.getDefaultNotice() 
  }
  // 占坑和报名截止时间
  // this.limits.occppy = !this.limits.occppy ? null : this.limits.occppy
  // this.limits.entry = !this.limits.entry ? null : void (0)
  
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

OD.prototype.getName = function() {
  return "this.a.getName()"
}

module.exports = {
  OD: OD,
  load: OD.prototype.load,
  // getName: OD.prototype.getName,
}