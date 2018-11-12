const app = getApp()
const util = require('../../utils/util.js')
const lvyeorg = require('../../utils/lvyeorg.js')
const qrcode = require('../../utils/qrcode.js')

wx.cloud.init()
const db = wx.cloud.database({})
const dbOutdoors = db.collection('Outdoors')
const dbPersons = db.collection('Persons')

Page({
  data: {
    outdoorid: null, // 页面活动已经存储到数据库中的活动id
    memOutdoorid: null, // 刚加载的活动，在数据库中的id，用来判断避免onShow中重复加载（与缓存中的id进行对比）
    canPublish: false, // 判断是否可发布，必须定义关键的几项：地点、日期、集合时间地点等,不保存
    hasModified: false, // 是否被修改了，可以保存起来
    modifys: { // 到底更新了哪些条目，这里做一个临时记录
      brief: false, // 文字介绍，图片暂时不管
      meets: false, // 集合地点
      route: false, // 活动路线
      limits: false, // 各类限制条件
      disclaimer: false, // 免责条款
      status:false, // 活动状态变化
    },

    // 常量定义
    Loadeds: ["轻装", "重装", "休闲"], // 枚举型：轻装、重装、休闲装
    Durings: ["一日", "两日", "三日", "四日", "五日", "多日"], // 活动时长枚举

    title: { // 活动标题，通过下面子项随时自动生成；
      whole: null, // 自动生成，也存起来
      place: null, // String; 地点描述。必填
      date: null, //必填。util.formatDate(util.nextDate(new Date(), 5)), //Date; 活动日期，能自动判断出：周六/周日/非周末; 默认活动日期为：当天的五天后
      during: "一日", // 默认为一日活动
      // duringIndex: 0, // +1 为活动天数
      loaded: "轻装", // 枚举型：轻装、重装、休闲装
      level: 1.0, //自动生成； Float，活动强度，自动计算得到，计算公式：sqrt(addedLength* addedUp/ 100)
      addedLength: 10, //Int，累积距离，单位：公里，最小值1
      addedUp: 10, //Int，累积上升，单位：百米，最小值1
      adjustLevel: 100, // 活动强度调节系数 100%意味着不调节
    },
    startDate: util.formatDate(new Date()), // 起始日期，格式化为字符串；只能从今天开始
    endDate: util.formatDate(util.nextDate(new Date(), 180)), // 截止日期，格式化为字符串，不保存；不能发半年之后的活动

    route: [], // 活动路线
    meets: [], //集合点，可加多个
    members: [], // 已报名成员（含领队）
    leader: { // 领队的信息也要记录起来
      personid: null,
      userInfo: null,
      entryInfo: {
        meetsIndex: -1,
        knowWay: true, // 领队默认为认路
        status: "领队"
      },
    },
    brief: { // 活动简要介绍，分为文字和图片（多张）
      disc: "领队有点懒，什么也没介绍",
      pics: [], // {src:string} 云存储路径
    },
    limits: { // 领队设置的活动限定条件
      disclaimer: "" //免责条款
    },
    status: "拟定中", // 活动本身的状态，分为：拟定中，已发布，报名截止，已取消

    // 同步到网站的信息
    websites: {
      lvyeorg: {
        fid: null, // 版块id
        tid: null, // 帖子id
        keepSame:false, // 是否保持同步
        waitings: [], // 要同步但尚未同步的信息列表
      }
    },
  },

  // 设置临时修改项目全部为false或true，包括整体是否修改标记
  setModifys(result) {
    this.data.hasModified = result
    this.data.modifys = { // 到底更新了哪些条目，这里做一个临时记录
      brief: result,
      meets: result,
      route: result,
      limits: result,
      disclaimer: result,
      status: result,
    }
  },

  // 判断是否有任一被修改了
  anyModify(modifys) {
    return modifys.brief || modifys.meets || modifys.route || modifys.limits || modifys.disclaimer || modifys.status
  },

  onLoad: function() {
    if (!app.globalData.hasUserInfo) { // 判断是否登录先
      wx.showModal({
        title: '发起活动需先登录',
        content: '小程序将自动切换到“我的信息”页面，请点击“微信登录”按钮登录；然后再回来创建活动',
        showCancel: false,
        confirmText: "知道了",
        complete: function(res) {
          wx.switchTab({
            url: '../MyInfo/MyInfo'
          })
        }
      })
      return; // 没有登录直接返回
    } else {
      this.loadOutdoorInTable(util.loadOutdoorID());
    }
  },

  loadOutdoorInTable: function(outdoorid) {
    const self = this
    self.setDefault(); // 每次先把几个关键信息置空，并加载当前用户为leader
    // 判断是否应加载一个在数据库中的活动信息
    if (outdoorid != null && outdoorid.length > 0) {
      dbOutdoors.doc(outdoorid).get()
        .then(res => {
          self.setData({
            outdoorid: outdoorid,
            memOutdoorid: outdoorid, // 加载活动，记得设置memOutdoorid
            title: res.data.title,
            status: res.data.status,
            route: res.data.route,
            meets: res.data.meets,
            leader: res.data.members[0],
            members: res.data.members,
          })
          // 读取之前活动数据时的兼容性处理
          self.dealCompatibility(res);
          self.loadDisclaimer(); // 还需要单独处理“免责条款”的内容

          // 这里要判断从本地缓存中读取到的outdoorid是自己创建的，还是用来当模板的
          // 依据是 从数据库读取的leader是否为自己
          if (self.data.leader.personid != app.globalData.personid) {
            self.newOutdoor(); //不是自己，就等于要新建活动
          }
          self.createAutoInfo();
          self.checkPublish(); // 判断一下是否能发布活动
          self.keepSameWithWebsites() // 网站同步
        })
    } else { // 本地缓存没有id，则说明是要新创建活动
      self.newOutdoor();
      self.createAutoInfo();
    }
  },

  // 判断是否需要与网站同步
  keepSameWithWebsites: function() {
    const self = this
    console.log("keepSameWithWebsites")
    console.log(self.data.websites)
    if (self.data.websites 
      && self.data.websites.lvyeorg 
      && (self.data.websites.lvyeorg.keepSame || self.data.websites.lvyeorg.tid) // 设置要同步或已同步过
      && self.data.leader.personid == app.globalData.personid // 并且还是自己的活动
      && self.data.outdoorid // 活动id必须有了
    ) {
      this.keepSameWithLvyeorg() // 同步到org上
    }
  },

  // 新建活动就是把 outdoor id清空，把关键信息删除
  newOutdoor: function() {
    const self = this;
    self.setData({
      outdoorid: null,
    })
    self.setDefault();
  },

  // 把几个关键设置为默认值即可，当新创建活动或者模板创建活动后调用
  setDefault: function() {
    const self = this
    // leader要设置为当前用户
    self.data.leader.userInfo = app.globalData.userInfo;
    self.data.leader.personid = app.globalData.personid;
    self.setData({
      canPublish: false, // 判断是否可发布
      hasModified: false, // 是否被修改了
      "title.date": null, // 新创建活动，关键是把日期置空了
      status: "拟定中",
    })
    self.setWebsitesDefault() // 把网址同步的设置置空
  },

  setWebsitesDefault:function(){
    this.setData({
      "websites.lvyeorg.tid":null,
      "websites.lvyeorg.waitings": [],
      "websites.lvyeorg.keepSame": (app.globalData.lvyeorgInfo ? app.globalData.lvyeorgInfo.keepSame:false),
    })
    console.log(this.data.websites)
  },
  
  onShow: function() {
    const self = this;
    var outdoorid = util.loadOutdoorID()

    if (outdoorid != null && outdoorid != self.data.memOutdoorid) {
      // 缓存中有id，且还和内存中加载的outdoorid不一样，则说明要重新加载
      self.loadOutdoorInTable(outdoorid);
    }
  },

  // 读取原来创建的活动兼容性处理，发现null值，赋予一个合理的默认值即可
  dealCompatibility: function(res) {
    const self = this;
    if (!self.data.title.adjustLevel) {
      self.setData({
        "title.adjustLevel": 100,
      })
    }
    // brief 文字加图片 
    if (res.data.brief) {
      self.setData({
        brief: res.data.brief,
      })
    }
    // 可选择的活动最早和最晚日期
    self.setData({
      startDate: util.formatDate(new Date()), // 起始日期，只能从今天开始
      endDate: util.formatDate(util.nextDate(new Date(), 180)), // 截止日期，不能发半年之后的活动
    })
    // limits
    if (res.data.limits) {
      self.setData({
        limits: res.data.limits,
      })
    }
    // 领队认路情况：默认领队就是认路的
    self.setData({
      "leader.entryInfo.knowWay": true,
    })
    // 几日活动，老存储：durings duringIndex
    if (!res.data.title.during && res.data.title.durings) {
      self.setData({
        "title.during": res.data.title.durings[res.data.title.duringIndex],
      })
    }
    // 网站同步信息
    if (res.data.websites) {
      self.setData({
        "websites": res.data.websites,
      })
    }
    console.log(self.data.websites)
    // next 
  },

  loadDisclaimer: function() {
    const self = this
    // 如果Outdoors表中没有免责条款的内容，则试着从Person表读取
    if (!self.data.limits || !self.data.limits.disclaimer) {
      dbPersons.doc(app.globalData.personid).get()
        .then(res => {
          if (res.data.disclaimer) {
            self.setData({
              "limits.disclaimer": res.data.disclaimer,
            })
          }
        })
    }
  },

  // 生成应 自动变化的内容，如强度值、标题等
  createAutoInfo: function() {
    this.calcLevel(); // 计算强度
    this.createTitle(); // 生成标题
  },

  // 根据各类信息，生成活动主题信息，修改whole
  createTitle: function() {
    const self = this;
    var result = "" // 2018.09.16（周日）大觉寺一日轻装1.0强度休闲游； 
    // 日期
    if (this.data.title.date) {
      result += this.data.title.date
      result += "(" + util.getDay(this.data.title.date) + ")"
    } else {
      result += "日期待定"
    }
    // 地点
    if (this.data.title.place) {
      result += this.data.title.place
    } else {
      result += "地点待定"
    }
    // 时长
    result += this.data.title.during
    // 轻装or重装
    result += this.data.title.loaded
    // 强度
    result += "强度" + this.data.title.level
    // 领队
    result += self.data.leader.userInfo.nickName + "队"
    this.setData({
      "title.whole": result
    })
  },

  // 判断是否可以发布了
  checkPublish: function() {
    this.setData({
      canPublish: this.data.title.place // 必须有活动地点
        &&
        this.data.title.date // 必须有活动日期
        &&
        this.data.meets.length > 0 // 必须有集合地点
        &&
        this.data.leader.entryInfo.meetsIndex >= 0 // 领队必须选择了集合地点
        &&
        this.data.leader.entryInfo.meetsIndex < this.data.meets.length // 领队集合地点必须在集合点范围内
    })
  },

  bindPlace: function(e) {
    console.log(e)
    this.setData({
      "title.place": e.detail,
      hasModified: true
    })
    this.createTitle()
    this.checkPublish()
  },

  bindDateChange: function(e) {
    this.setData({
      "title.date": e.detail.value,
      hasModified: true
    })
    this.createTitle()
    this.checkPublish()
  },

  bindChangeDuring: function(e) {
    console.log(e)
    const self = this
    this.setData({
      "title.during": self.data.Durings[e.detail.value],
      hasModified: true
    })
    this.calcLevel()
    this.createTitle()
  },

  bindChangeLoaded: function(e) {
    console.log(e)
    const self = this
    this.setData({
      "title.loaded": self.data.Loadeds[e.detail.value],
      hasModified: true
    })
    this.calcLevel()
    this.createTitle()
  },

  // 计算强度
  calcLevel: function() {
    // var temp = Math.sqrt(this.data.title.addedLength * this.data.title.addedUp / 100.0)
    /**强度计算公式，原则：按照鼓励爬升，弱化距离的原则；但超长距离的弱化程度会降低。
先归一化：公里数/10，爬升米数/1000
公式：求和（分段距离*距离系数）+爬升高度*爬升系数
0-10公里部分，距离系数为0.6
10-20公里部分，距离系数为0.7
20-50公里部分，距离系数为0.8
50-100公里部分，距离系数为0.9
爬升系数为： 2-距离系数 */
    // 归一化
    var length = this.data.title.addedLength / 10.0; // 单位：公里
    var up = this.data.title.addedUp / 10.0; // 单位：千米
    var lValue = 0; // 距离带来的强度值
    while (length > 0) {
      if (length > 5) {
        lValue += (length - 5) * 0.9;
        length -= 5;
      } else if (length > 2) {
        lValue += (length - 2) * 0.8;
        length -= 2;
      } else if (length > 1) {
        lValue += (length - 1) * 0.7;
        length -= 1;
      } else { // length [0,1]
        lValue += length * 0.6;
        length -= 1;
      }
    }
    var uQuotiety = 2 - lValue / (this.data.title.addedLength / 10.0);
    var level = (up * uQuotiety + lValue) / 2;

    // 重装 *1.5，休闲游（如景区）：*0.5
    if (this.data.title.loaded == "重装") {
      level *= 1.5
    } else if (this.data.title.loaded == "休闲装") {
      level *= 0.5
    }
    // 多日活动：除以天数乘以1.5
    console.log(this.data.title)
    var duringCount = util.parseChar(this.data.title.during[0])
    if (duringCount > 1) {
      level = level * 1.5 / (duringCount + 1)
    }

    // 领队调节强度系数
    if (this.data.title.adjustLevel != null) {
      level *= this.data.title.adjustLevel / 100.0;
    }

    this.setData({
      "title.level": level.toFixed(1)
    })
  },

  bindAddedLength: function(e) {
    this.setData({
      "title.addedLength": e.detail,
      hasModified: true
    })
    this.calcLevel()
    this.createTitle()
  },

  bindAddedUp: function(e) {
    this.setData({
      "title.addedUp": e.detail,
      hasModified: true
    })
    this.calcLevel()
    this.createTitle()
  },

  // 领队调节强度系数
  bindAdjustLevel: function(e) {
    this.setData({
      "title.adjustLevel": e.detail,
      hasModified: true
    })
    this.calcLevel()
    this.createTitle()
  },

  // 活动一旦发起，就不能删除，只能取消
  // 取消活动就是修改 Outdoors表中的status
  cancelOutdoor: function() {
    this.updateStatus("已取消")
  },

  // 恢复活动
  resumeOutdoor: function() {
    this.updateStatus("已发布")
  },

  // 截止报名
  stopEntry: function() {
    this.updateStatus("报名截止")
  },

  // 恢复报名
  continueEntry: function() {
    this.updateStatus("已发布")
  },

  // 在活动还没有发布的时候，保存活动草稿
  saveDraft: function() {
    // 其实就是记录一下不一样的状态，就好了
    this.saveOutdoor("拟定中")
  },

  // 发布活动
  publishOutdoor: function() {
    this.saveOutdoor("已发布")
  },

  // 几个相关操作，都是更新一下 Outdoors表中的活动状态而已
  updateStatus: function(status) {
    const self = this;
    self.setData({
      status: status
    })
    dbOutdoors.doc(self.data.outdoorid).update({
      data: {
        status: self.data.status,
      }
    }).then(res=>{
      // 同步到网站
      self.data.modifys.status = true // 标记一下：活动状态改变了
      self.keepSameWithWebsites()
    })
  },

  // 保存 活动的更新信息
  saveModified: function() {
    this.saveOutdoor("已发布")
  },

  // 更新信息
  updateOutdoorInTable: function() {
    const self = this;
    // 领队信息也要更新一下
    var members = [self.data.leader];
    dbOutdoors.doc(self.data.outdoorid).update({
      data: {
        title: self.data.title,
        route: self.data.route,
        meets: self.data.meets,
        status: self.data.status,
        members: members,
        brief: self.data.brief,
        limits: self.data.limits,
      }
    }).then(res => {
      self.afterSaveOutdoor();
      // 这里还应该把 Person表中对应的MyOutdoors中的title更新一下
      self.updatePersonMyoutdoors();
    }).catch(console.error)
  },

  // 创建活动信息记录
  createOutdoorInTable: function() {
    const self = this;
    // 先把领队的信息从数据库中调出来
    var personid = app.globalData.personid; // util.loadPersonID();
    dbPersons.doc(personid).get()
      .then(res => {
        self.data.leader.userInfo = res.data.userInfo;
        self.data.leader.personid = personid;
        var members = [self.data.leader];
        // 处理免责条款内容
        if (res.data.disclaimer) {
          self.data.limits.disclaimer = res.data.disclaimer
        }
        dbOutdoors.add({ // 没有outdoor id,则新加一条记录
          data: {
            title: self.data.title,
            route: self.data.route,
            meets: self.data.meets,
            members: members, // 写入领队信息
            status: self.data.status,
            brief: self.data.brief,
            limits: self.data.limits,
          }
        }).then(res => {
          self.setData({
            outdoorid: res._id, // 活动表id
          })
          self.afterSaveOutdoor();

          // 发布成功，就需要往person表中追加活动id
          dbPersons.doc(app.globalData.personid).get()
            .then(resPerson => { // 先取出原来
              // 追加活动id和标题
              resPerson.data.myOutdoors.unshift({
                id: self.data.outdoorid,
                title: self.data.title.whole
              })
              dbPersons.doc(app.globalData.personid).update({
                data: {
                  myOutdoors: resPerson.data.myOutdoors
                }
              })
            })
        }).catch(console.error)
      })
  },

  saveOutdoor: function(status) {
    const self = this;
    self.setData({
      status: status,
    })

    if (self.data.outdoorid) { // 有outdoorid,说明Outdoors数据库中已经有记录,更新信息就好
      self.updateOutdoorInTable()
    } else {
      self.createOutdoorInTable()
    }
    self.setData({
      hasModified: false
    })
  },

  // 在成功保存outdoor之后，相应的一些处理，包括id和brief中的照片
  afterSaveOutdoor: function() {
    const self = this;
    util.saveOutdoorID(self.data.outdoorid)
    self.data.memOutdoorid = self.data.outdoorid;
    self.copyPics(); // 把照片中不是自己的，拷贝一份给自己用
    // 这里处理和ORG网站同步的事情
    self.keepSameWithLvyeorg()
  },

  // 保存修改时，在org网站跟帖发布信息
  postModifys: function() {
    console.log("postModifys:function")
    console.log(this.data.modifys)
    if (this.anyModify(this.data.modifys)) { // 有一点修改，才有必要 跟帖发布
      var message = lvyeorg.buildOutdoorMesage(this.data, false, this.data.modifys, "领队对以下内容作了更新，请报名者留意！", this.data.websites.lvyeorg.allowSiteEntry) // 构建活动信息
      lvyeorg.postMessage(this.data.outdoorid, this.data.websites.lvyeorg.tid, message)
      // 用完了得把modifys都设置为false
      this.setModifys(false)
    }
  },

  // 这里处理和ORG网站同步的事情
  keepSameWithLvyeorg: function() {
    const self = this
    console.log(self.data.websites)
    console.log(app.globalData.lvyeorgInfo)
    // 逻辑关系：
    // 看 outdoors中是否设置了 同步
    if (self.data.websites && self.data.websites.lvyeorg){
      if (!app.globalData.lvyeorgLogin) { // 尚未登录，则等待登录
        app.callbackLoginLvyeorg = (username) => {
          self.post2LvyeorgInner()
        }
      } else { // 登录了直接发布信息就好
        self.post2LvyeorgInner()
      }
    }
  },

  // 内部处理函数，避免重复代码
  post2LvyeorgInner:function(){
    console.log("post2LvyeorgInner:function")
    const self = this
    // 没有 tid，则先生成tid；再处理waitings
    if (!self.data.websites.lvyeorg.tid) {
      lvyeorg.addThread(self.data.outdoorid, self.data, tid => {
        self.data.websites.lvyeorg.tid = tid
        lvyeorg.postWaitings(self.data.outdoorid, tid)
      })
    } else {
      // 有tid，则先处理“保存更新”
      self.postModifys() // 有tid，是跟帖，更新活动信息
      // 最后处理 waitings
      lvyeorg.postWaitings(self.data.outdoorid, self.data.websites.lvyeorg.tid)
    }
  },

  // 这里还应该把 Person表中对应的MyOutdoors中的title更新一下
  updatePersonMyoutdoors: function() {
    const self = this
    dbPersons.doc(app.globalData.personid).get()
      .then(res => {
        res.data.myOutdoors.forEach((item, index) => {
          if (item.id == self.data.outdoorid) {
            item.title = self.data.title.whole
          }
        })
        dbPersons.doc(app.globalData.personid).update({
          data: {
            myOutdoors: res.data.myOutdoors
          }
        })
      })
  },

  // 查看报名情况，同时可以截屏保存起来
  printOutdoor: function() {
    // 导航到 printOutdoor页面
    const self = this;
    util.saveOutdoorID(self.data.outdoorid)
    wx.navigateTo({
      url: "../PrintOutdoor/PrintOutdoor?outdoorid=" + self.data.outdoorid + "&isLeader=true"
    })
  },

  onShareAppMessage: function(options) {
    const self = this;
    // options.from == "menu" &&     // options.type = "tap" from="button"
    if (self.data.outdoorid) { // 数据库里面有，才能分享出去
      return {
        title: self.data.title.whole,
        desc: '分享活动',
        path: 'pages/EntryOutdoor/EntryOutdoor?outdoorid=' + self.data.outdoorid
      }
    }
  },

  onShare2Circle: function() {
    const self = this;
    qrcode.share2Circle(self.data.outdoorid, self.data.title.whole, true)
  },

  clickMeets: function(e) {
    console.log(e)
    this.setData({
      "leader.entryInfo.meetsIndex": parseInt(e.target.dataset.name),
      hasModified: true,
    })
  },

  // 选择或改变集合地点选择
  changeMeets: function(e) {
    console.log(e)
    this.setData({
      "leader.entryInfo.meetsIndex": parseInt(e.detail),
      hasModified: true,
    })
  },

  // 修改文字
  bindBriefText: function(e) {
    console.log(e)
    this.setData({
      "brief.disc": e.detail,
      hasModified: true,
      "modifys.brief": true,
    })
  },

  pasteBriefDisc: function() {
    const self = this
    wx.getClipboardData({
      success: function(res) {
        console.log(res.data)
        self.setData({
          "brief.disc": res.data,
          hasModified: true,
          "modifys.brief": true,
        })
      }
    })
  },

  // 调出上传照片页面
  clickUploadPics: function() {
    if (this.data.outdoorid) {
      wx.navigateTo({
        url: "UploadPics?outdoorid=" + this.data.outdoorid,
      })
    }
  },

  // 把照片中不是自己的，拷贝一份给自己用
  copyPics: function() {
    const self = this;
    if (self.data.brief && self.data.brief.pics.length > 0) {
      self.data.brief.pics.forEach((item, index) => {
        if (item.src.indexOf(self.data.outdoorid) == -1) { // -1 表示不是用当前活动id构建的，则需要下载，再上传图片
          wx.cloud.downloadFile({ // 下载先
            fileID: item.src
          }).then(res => {
            wx.cloud.uploadFile({ // 再上传到自己的活动目录下
              cloudPath: util.buildPicSrc(self.data.outdoorid, index),
              filePath: res.tempFilePath, // 小程序临时文件路径
            }).then(res => {
              item.src = res.fileID;
              self.setData({
                "brief.pics": self.data.brief.pics,
                hasModified: true,
              })
            }).catch(err => {
              console.log(err)
            })
          }).catch(err => {
            console.log(err)
          })
        }
      })
    }
  },

})