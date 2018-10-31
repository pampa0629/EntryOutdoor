module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = { exports: {} }; __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); if(typeof m.exports === "object") { Object.keys(m.exports).forEach(function(k) { __MODS__[modId].m.exports[k] = m.exports[k]; }); if(m.exports.__esModule) Object.defineProperty(__MODS__[modId].m.exports, "__esModule", { value: true }); } else { __MODS__[modId].m.exports = m.exports; } } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1540477685972, function(require, module, exports) {
const storage = require("./src/storage");
const database = require("./src/db").Db;
const functions = require("./src/functions");
const wx = require("./src/wx");

function Tcb(config) {
  // console.log(config)
  this.config = config ? config : this.config
}

Tcb.prototype.init = function ({
  secretId,
  secretKey,
  sessionToken,
  env,
  proxy
} = {}) {
  if ((secretId && !secretKey) || (!secretId && secretKey)) {
    throw Error("secretId and secretKey must be a pair");
  }

  this.config = {
    get secretId() {
      return this._secretId
        ? this._secretId
        : process.env.TENCENTCLOUD_SECRETID;
    },
    set secretId(id) {
      this._secretId = id;
    },
    get secretKey() {
      return this._secretKey
        ? this._secretKey
        : process.env.TENCENTCLOUD_SECRETKEY;
    },
    set secretKey(key) {
      this._secretKey = key;
    },
    get sessionToken() {
      if (this._sessionToken === undefined) {
        //默认临时密钥
        return process.env.TENCENTCLOUD_SESSIONTOKEN;
      } else if (this._sessionToken === false) {
        //固定秘钥
        return undefined;
      } else {
        //传入的临时密钥
        return this._sessionToken;
      }
    },
    set sessionToken(token) {
      this._sessionToken = token;
    },
    envName: env,
    proxy: proxy
  };

  this.config.secretId = secretId;
  this.config.secretKey = secretKey;
  this.config.sessionToken = sessionToken ? sessionToken : (secretId && secretKey ? false : undefined);

  return new Tcb(this.config);
};

Tcb.prototype.database = function () {
  return new database(this);
};

function each(obj, fn) {
  for (var i in obj) {
    if (obj.hasOwnProperty(i)) {
      fn(obj[i], i);
    }
  }
}

function extend(target, source) {
  each(source, function (val, key) {
    target[key] = source[key];
  });
  return target;
}

extend(Tcb.prototype, functions);
extend(Tcb.prototype, storage);
extend(Tcb.prototype, wx)

module.exports = new Tcb();

}, function(modId) {var map = {"./src/db":1540477685974,"./src/functions":1540477685989,"./src/wx":1540477685990}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1540477685974, function(require, module, exports) {
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./db"));

}, function(modId) { var map = {"./db":1540477685975}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1540477685975, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Geo = require("./geo");
const collection_1 = require("./collection");
const command_1 = require("./command");
const serverDate_1 = require("./serverDate");
const request_1 = require("./request");
class Db {
    constructor(config) {
        this.config = config;
        this.Geo = Geo;
        this.command = new command_1.Command();
    }
    serverDate({ offset = 0 } = {}) {
        return new serverDate_1.ServerDate({ offset });
    }
    collection(collName) {
        if (!collName) {
            throw new Error("Collection name is required");
        }
        return new collection_1.CollectionReference(this, collName);
    }
    createCollection(collName) {
        let request = new request_1.Request(this);
        const params = {
            collectionName: collName
        };
        return request.send("addCollection", params);
    }
}
exports.Db = Db;

}, function(modId) { var map = {"./geo":1540477685976,"./collection":1540477685983,"./command":1540477685981,"./serverDate":1540477685982,"./request":1540477685985}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1540477685976, function(require, module, exports) {
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./point"));

}, function(modId) { var map = {"./point":1540477685977}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1540477685977, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validate_1 = require("../validate");
class Point {
    constructor(longitude, latitude) {
        validate_1.Validate.isGeopoint("latitude", latitude);
        validate_1.Validate.isGeopoint("longitude", longitude);
        this.latitude = latitude;
        this.longitude = longitude;
    }
}
exports.Point = Point;

}, function(modId) { var map = {"../validate":1540477685978}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1540477685978, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constant_1 = require("./constant");
const util_1 = require("./util");
class Validate {
    static isGeopoint(point, degree) {
        if (util_1.Util.whichType(degree) !== constant_1.FieldType.Number) {
            throw new Error("Geo Point must be number type");
        }
        const degreeAbs = Math.abs(degree);
        if (point === "latitude" && degreeAbs > 90) {
            throw new Error("latitude should be a number ranges from -90 to 90");
        }
        else if (point === "longitude" && degreeAbs > 180) {
            throw new Error("longitude should be a number ranges from -180 to 180");
        }
        return true;
    }
    static isInteger(param, num) {
        if (!Number.isInteger(num)) {
            throw new Error(param + constant_1.ErrorCode.IntergerError);
        }
        return true;
    }
    static isFieldOrder(direction) {
        if (constant_1.OrderDirectionList.indexOf(direction) === -1) {
            throw new Error(constant_1.ErrorCode.DirectionError);
        }
        return true;
    }
    static isFieldPath(path) {
        if (!/^[a-zA-Z0-9-_\.]/.test(path)) {
            throw new Error();
        }
        return true;
    }
    static isOperator(op) {
        if (constant_1.WhereFilterOpList.indexOf(op) === -1) {
            throw new Error(constant_1.ErrorCode.OpStrError);
        }
        return true;
    }
    static isCollName(name) {
        if (!/^[a-zA-Z0-9]([a-zA-Z0-9-_]){1,32}$/.test(name)) {
            throw new Error(constant_1.ErrorCode.CollNameError);
        }
        return true;
    }
    static isDocID(docId) {
        if (!/^([a-fA-F0-9]){24}$/.test(docId)) {
            throw new Error(constant_1.ErrorCode.DocIDError);
        }
        return true;
    }
}
exports.Validate = Validate;

}, function(modId) { var map = {"./constant":1540477685979,"./util":1540477685980}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1540477685979, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["DocIDError"] = "\u6587\u6863ID\u4E0D\u5408\u6CD5";
    ErrorCode["CollNameError"] = "\u96C6\u5408\u540D\u79F0\u4E0D\u5408\u6CD5";
    ErrorCode["OpStrError"] = "\u64CD\u4F5C\u7B26\u4E0D\u5408\u6CD5";
    ErrorCode["DirectionError"] = "\u6392\u5E8F\u5B57\u7B26\u4E0D\u5408\u6CD5";
    ErrorCode["IntergerError"] = "must be integer";
})(ErrorCode || (ErrorCode = {}));
exports.ErrorCode = ErrorCode;
const FieldType = {
    String: "String",
    Number: "Number",
    Object: "Object",
    Array: "Array",
    Boolean: "Boolean",
    Null: "Null",
    GeoPoint: "GeoPoint",
    Timestamp: "Date",
    Command: "Command",
    ServerDate: "ServerDate"
};
exports.FieldType = FieldType;
const OrderDirectionList = ["desc", "asc"];
exports.OrderDirectionList = OrderDirectionList;
const WhereFilterOpList = ["<", "<=", "==", ">=", ">"];
exports.WhereFilterOpList = WhereFilterOpList;
var Opeartor;
(function (Opeartor) {
    Opeartor["lt"] = "<";
    Opeartor["gt"] = ">";
    Opeartor["lte"] = "<=";
    Opeartor["gte"] = ">=";
    Opeartor["eq"] = "==";
})(Opeartor || (Opeartor = {}));
exports.Opeartor = Opeartor;
const OperatorMap = {
    [Opeartor.eq]: "$eq",
    [Opeartor.lt]: "$lt",
    [Opeartor.lte]: "$lte",
    [Opeartor.gt]: "$gt",
    [Opeartor.gte]: "$gte"
};
exports.OperatorMap = OperatorMap;
const UpdateOperatorList = [
    "$set",
    "$inc",
    "$mul",
    "$unset",
    "$push",
    "$pop",
    "$unshift",
    "$shift",
    "$currentDate",
    "$each",
    "$position"
];
exports.UpdateOperatorList = UpdateOperatorList;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1540477685980, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constant_1 = require("./constant");
const point_1 = require("./geo/point");
const command_1 = require("./command");
const deepAssign = require("deep-assign");
const serverDate_1 = require("./serverDate");
class Util {
}
Util.encodeGeoPoint = (point) => {
    if (!(point instanceof point_1.Point)) {
        throw new Error("encodeGeoPoint: must be GeoPoint type");
    }
    return {
        type: "Point",
        coordinates: [point.latitude, point.longitude]
    };
};
Util.encodeServerDate = (serverDate) => {
    return { $date: { offset: serverDate.offset } };
};
Util.encodeTimestamp = (stamp) => {
    if (!(stamp instanceof Date)) {
        throw new Error("encodeTimestamp: must be Date type");
    }
    return {
        $timestamp: Math.floor(stamp.getTime() / 1000)
    };
};
Util.encodeDocumentDataForReq = (document, merge = false, concatKey = true) => {
    const keys = Object.keys(document);
    let params = {};
    if (Array.isArray(document)) {
        params = [];
    }
    const getCommandVal = (obj) => {
        let res = {};
        let command = new command_1.Command();
        command.concatKeys(obj, '', res);
        for (let key in res) {
            if (res[key] instanceof command_1.Command) {
                res[key] = res[key].parse(key);
            }
        }
        return res;
    };
    keys.forEach(key => {
        const item = document[key];
        const type = Util.whichType(item);
        let realValue;
        if (type === constant_1.FieldType.GeoPoint) {
            realValue = { [key]: Util.encodeGeoPoint(item).coordinates };
        }
        else if (type === constant_1.FieldType.Timestamp) {
            realValue = { [key]: Util.encodeTimestamp(item) };
        }
        else if (type === constant_1.FieldType.ServerDate) {
            realValue = { [key]: Util.encodeServerDate(item) };
        }
        else if (type === constant_1.FieldType.Object) {
            if (concatKey) {
                realValue = getCommandVal({ [key]: item });
            }
            else {
                realValue = { [key]: Util.encodeDocumentDataForReq(item, merge, concatKey) };
            }
        }
        else if (type === constant_1.FieldType.Command) {
            realValue = item.parse(key);
        }
        else {
            realValue = { [key]: item };
        }
        if (constant_1.UpdateOperatorList.indexOf(Object.keys(realValue)[0]) === -1 && merge === true) {
            realValue = { $set: realValue };
        }
        if (Array.isArray(params)) {
            params.push(realValue);
        }
        else {
            params = deepAssign({}, params, realValue);
        }
    });
    if (params.$set) {
        for (let concatKey in params.$set) {
            for (let key in params.$set[concatKey]) {
                if (constant_1.UpdateOperatorList.indexOf(key) > -1) {
                    if (params[key] === undefined) {
                        params[key] = Object.assign({}, params.$set[concatKey][key]);
                    }
                    else {
                        params[key] = Object.assign({}, params[key], params.$set[concatKey][key]);
                    }
                    delete params.$set[concatKey];
                }
            }
        }
        if (Object.keys(params.$set).length === 0) {
            delete params.$set;
        }
    }
    return params;
};
Util.formatResDocumentData = (documents) => {
    return documents.map(document => {
        return Util.formatField(document);
    });
};
Util.formatField = document => {
    const keys = Object.keys(document);
    let protoField = {};
    if (Array.isArray(document)) {
        protoField = [];
    }
    keys.forEach(key => {
        const item = document[key];
        const type = Util.whichType(item);
        let realValue;
        switch (type) {
            case constant_1.FieldType.GeoPoint:
                realValue = new point_1.Point(item.coordinates[0], item.coordinates[1]);
                break;
            case constant_1.FieldType.Timestamp:
                realValue = new Date(item.$timestamp * 1000);
                break;
            case constant_1.FieldType.Object:
            case constant_1.FieldType.Array:
                realValue = Util.formatField(item);
                break;
            case constant_1.FieldType.ServerDate:
                realValue = new Date(item.$date);
                break;
            default:
                realValue = item;
        }
        if (Array.isArray(protoField)) {
            protoField.push(realValue);
        }
        else {
            protoField[key] = realValue;
        }
    });
    return protoField;
};
Util.whichType = (obj) => {
    let type = Object.prototype.toString.call(obj).slice(8, -1);
    if (type === constant_1.FieldType.Object) {
        if (obj instanceof point_1.Point) {
            return constant_1.FieldType.GeoPoint;
        }
        else if (obj instanceof Date) {
            return constant_1.FieldType.Timestamp;
        }
        else if (obj instanceof command_1.Command) {
            return constant_1.FieldType.Command;
        }
        else if (obj instanceof serverDate_1.ServerDate) {
            return constant_1.FieldType.ServerDate;
        }
        if (obj.$timestamp) {
            type = constant_1.FieldType.Timestamp;
        }
        else if (obj.$date) {
            type = constant_1.FieldType.ServerDate;
        }
        else if (Array.isArray(obj.coordinates) && obj.type === "Point") {
            type = constant_1.FieldType.GeoPoint;
        }
    }
    return type;
};
Util.generateDocId = () => {
    let chars = "ABCDEFabcdef0123456789";
    let autoId = "";
    for (let i = 0; i < 24; i++) {
        autoId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return autoId;
};
exports.Util = Util;

}, function(modId) { var map = {"./constant":1540477685979,"./geo/point":1540477685977,"./command":1540477685981,"./serverDate":1540477685982}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1540477685981, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Command {
    constructor(logicParam) {
        this.logicParam = {};
        this.placeholder = "{{{AAA}}}";
        this.toString = () => {
            return this.logicParam[0];
        };
        if (logicParam) {
            this.logicParam = logicParam;
        }
    }
    eq(target) {
        return new Command(this.baseOperate("$eq", target));
    }
    neq(target) {
        return new Command(this.baseOperate("$ne", target));
    }
    gt(target) {
        return new Command(this.baseOperate("$gt", target));
    }
    gte(target) {
        return new Command(this.baseOperate("$gte", target));
    }
    lt(target) {
        return new Command(this.baseOperate("$lt", target));
    }
    lte(target) {
        return new Command(this.baseOperate("$lte", target));
    }
    in(target) {
        return new Command(this.baseOperate("$in", target));
    }
    nin(target) {
        return new Command(this.baseOperate("$nin", target));
    }
    regex(target) {
        var result = new Command(this.baseOperate("$regex", target.regex));
        result.logicParam[this.placeholder]['$options'] = target.options;
        return result;
    }
    mul(target) {
        return new Command({ $mul: { [this.placeholder]: target } });
    }
    remove() {
        return new Command({ $unset: { [this.placeholder]: "" } });
    }
    inc(target) {
        return new Command({ $inc: { [this.placeholder]: target } });
    }
    set(target) {
        return new Command({ $set: { [this.placeholder]: target } });
    }
    push(target) {
        let value = target;
        if (Array.isArray(target)) {
            value = { $each: target };
        }
        return new Command({ $push: { [this.placeholder]: value } });
    }
    pop() {
        return new Command({ $pop: { [this.placeholder]: 1 } });
    }
    unshift(target) {
        let value = { $each: [target], $position: 0 };
        if (Array.isArray(target)) {
            value = { $each: target, $position: 0 };
        }
        return new Command({
            $push: { [this.placeholder]: value }
        });
    }
    shift() {
        return new Command({ $pop: { [this.placeholder]: -1 } });
    }
    baseOperate(operator, target) {
        return {
            [this.placeholder]: { [operator]: target }
        };
    }
    and(...targets) {
        if (targets.length === 1 && Array.isArray(targets[0])) {
            targets = targets[0];
        }
        return new Command(this.connectOperate("$and", targets));
    }
    or(...targets) {
        if (targets.length === 1 && Array.isArray(targets[0])) {
            targets = targets[0];
        }
        return new Command(this.connectOperate("$or", targets));
    }
    connectOperate(operator, targets) {
        let logicParams = [];
        if (Object.keys(this.logicParam).length > 0) {
            logicParams.push(this.logicParam);
        }
        for (let target of targets) {
            if (target instanceof Command) {
                if (Object.keys(target.logicParam).length === 0) {
                    continue;
                }
                logicParams.push(target.logicParam);
            }
            else {
                let tmp = {};
                this.concatKeys(target, '', tmp);
                let tmp1 = {};
                for (let keys in tmp) {
                    let value = tmp[keys];
                    if (value instanceof Command) {
                        Object.assign(tmp1, value.parse(keys));
                    }
                    else {
                        Object.assign(tmp1, {
                            [keys]: value
                        });
                    }
                }
                logicParams.push(tmp1);
            }
        }
        this.logicParam = [];
        return {
            [operator]: logicParams
        };
    }
    parse(key) {
        return JSON.parse(JSON.stringify(this.logicParam).replace(/{{{AAA}}}/g, key));
    }
    concatKeys(obj, key, res) {
        let keys, value;
        for (let k in obj) {
            if (typeof obj[k] === 'object' &&
                obj[k] instanceof Command === false) {
                keys = key ? key + '.' + k : k;
                this.concatKeys(obj[k], keys, res);
            }
            else {
                keys = key ? key + '.' + k : k;
                value = obj[k];
                Object.assign(res, { [keys]: value });
            }
        }
    }
}
exports.Command = Command;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1540477685982, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ServerDate {
    constructor({ offset }) {
        this.offset = offset;
    }
}
exports.ServerDate = ServerDate;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1540477685983, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const document_1 = require("./document");
const query_1 = require("./query");
class CollectionReference extends query_1.Query {
    constructor(db, coll) {
        super(db, coll);
    }
    get name() {
        return this._coll;
    }
    doc(docID) {
        return new document_1.DocumentReference(this._db, this._coll, docID);
    }
    add(data) {
        let docRef = this.doc();
        return docRef.create(data);
    }
}
exports.CollectionReference = CollectionReference;

}, function(modId) { var map = {"./document":1540477685984,"./query":1540477685988}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1540477685984, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request_1 = require("./request");
const util_1 = require("./util");
const command_1 = require("./command");
class DocumentReference {
    constructor(db, coll, docID, projection = {}) {
        this._db = db;
        this._coll = coll;
        this.id = docID;
        this.request = new request_1.Request(this._db);
        this.projection = projection;
    }
    create(data) {
        let params = {
            collectionName: this._coll,
            data: util_1.Util.encodeDocumentDataForReq(data, false, false)
        };
        if (this.id) {
            params["_id"] = this.id;
        }
        return new Promise(resolve => {
            this.request.send("addDocument", params).then(res => {
                if (res.code) {
                    resolve(res);
                }
                resolve({
                    id: res.data._id,
                    requestId: res.requestId
                });
            });
        });
    }
    set(data) {
        if (!data || typeof data !== "object") {
            return Promise.resolve({
                code: 'INVALID_PARAM',
                message: '参数必需是非空对象'
            });
        }
        if (data.hasOwnProperty('_id')) {
            return Promise.resolve({
                code: 'INVALID_PARAM',
                message: '不能更新_id的值'
            });
        }
        let hasOperator = false;
        const checkMixed = (objs) => {
            if (typeof objs === 'object') {
                for (let key in objs) {
                    if (objs[key] instanceof command_1.Command) {
                        hasOperator = true;
                    }
                    else if (typeof objs[key] === 'object') {
                        checkMixed(objs[key]);
                    }
                }
            }
        };
        checkMixed(data);
        if (hasOperator) {
            return Promise.resolve({
                code: 'DATABASE_REQUEST_FAILED',
                message: 'update operator complicit'
            });
        }
        const merge = false;
        let param = {
            collectionName: this._coll,
            data: util_1.Util.encodeDocumentDataForReq(data, merge, false),
            multi: false,
            merge,
            upsert: true
        };
        if (this.id) {
            param["query"] = { _id: this.id };
        }
        return new Promise(resolve => {
            this.request.send("updateDocument", param).then(res => {
                if (res.code) {
                    resolve(res);
                }
                else {
                    resolve({
                        updated: res.data.updated,
                        upsertedId: res.data.upserted_id,
                        requestId: res.requestId
                    });
                }
            });
        });
    }
    update(data) {
        if (!data || typeof data !== "object") {
            return Promise.resolve({
                code: 'INVALID_PARAM',
                message: '参数必需是非空对象'
            });
        }
        if (data.hasOwnProperty('_id')) {
            return Promise.resolve({
                code: 'INVALID_PARAM',
                message: '不能更新_id的值'
            });
        }
        const query = { _id: this.id };
        const merge = true;
        const param = {
            collectionName: this._coll,
            data: util_1.Util.encodeDocumentDataForReq(data, merge, true),
            query: query,
            multi: false,
            merge,
            upsert: false
        };
        return new Promise(resolve => {
            this.request.send("updateDocument", param).then(res => {
                if (res.code) {
                    resolve(res);
                }
                else {
                    resolve({
                        updated: res.data.updated,
                        upsertedId: res.data.upserted_id,
                        requestId: res.requestId
                    });
                }
            });
        });
    }
    remove() {
        const query = { _id: this.id };
        const param = {
            collectionName: this._coll,
            query: query,
            multi: false
        };
        return new Promise(resolve => {
            this.request.send("deleteDocument", param).then(res => {
                if (res.code) {
                    resolve(res);
                }
                else {
                    resolve({
                        deleted: res.data.deleted,
                        requestId: res.requestId
                    });
                }
            });
        });
    }
    get() {
        const query = { _id: this.id };
        const param = {
            collectionName: this._coll,
            query: query,
            multi: false,
            projection: this.projection
        };
        return new Promise(resolve => {
            this.request.send("queryDocument", param).then(res => {
                if (res.code) {
                    resolve(res);
                }
                else {
                    const documents = util_1.Util.formatResDocumentData(res.data.list);
                    resolve({
                        data: documents,
                        requestId: res.requestId,
                        total: res.TotalCount,
                        limit: res.Limit,
                        offset: res.Offset
                    });
                }
            });
        });
    }
    field(projection) {
        for (let k in projection) {
            if (projection[k]) {
                projection[k] = 1;
            }
            else {
                projection[k] = 0;
            }
        }
        return new DocumentReference(this._db, this._coll, this.id, projection);
    }
}
exports.DocumentReference = DocumentReference;

}, function(modId) { var map = {"./request":1540477685985,"./util":1540477685980,"./command":1540477685981}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1540477685985, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const requestHandler = require("../utils/httpRequest");
class Request {
    constructor(db) {
        this.db = db;
    }
    send(api, data) {
        const params = Object.assign({}, data, {
            action: `database.${api}`
        });
        return requestHandler({
            config: this.db.config.config,
            params,
            method: "post",
            headers: {
                "content-type": "application/json"
            }
        });
    }
}
exports.Request = Request;

}, function(modId) { var map = {"../utils/httpRequest":1540477685986}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1540477685986, function(require, module, exports) {
var request = require("request");
var auth = require("./auth.js");

module.exports = function (args) {
  var config = args.config,
    params = args.params,
    method = args.method || "get";

  const eventId = (new Date()).valueOf() + '_' + Math.random().toString().substr(2,5)

  params = Object.assign({}, params, {
    envName: config.envName,
    timestamp: new Date().valueOf(),
    eventId
  });

  for (let key in params) {
    if (params[key] === undefined) {
      delete params[key];
    }
  }

  let file = null;
  if (params.action === "storage.uploadFile") {
    file = params["file"];
    delete params["file"];
  }

  if (!config.secretId || !config.secretKey) {
    if (process.env.TENCENTCLOUD_RUNENV === 'SCF') {
      throw Error("missing authoration key, redeploy the function")
    }
    throw Error("missing secretId or secretKey of tencent cloud");
  }

  const authObj = {
    SecretId: config.secretId,
    SecretKey: config.secretKey,
    Method: method,
    pathname: "/admin",
    Query: params,
    Headers: Object.assign(
      {
        "user-agent": "tcb-admin-sdk"
      },
      args.headers || {}
    )
  };

  var authorization = auth.getAuth(authObj);

  params.authorization = authorization;
  file && (params.file = file);
  config.sessionToken && (params.sessionToken = config.sessionToken);

  // console.log(params);
  var opts = {
    // url: 'http://localhost:8002/admin',
    url: "http://tcb-admin.tencentcloudapi.com/admin",
    method: args.method || "get",
    timeout: args.timeout || 50000,
    headers: authObj.Headers,
    proxy: config.proxy
  };

  if (params.action === "storage.uploadFile") {
    opts.formData = params;
    opts.formData.file = {
      value: params.file,
      options: {
        filename: params.path
      }
    };
  } else if (args.method == "post") {
    opts.body = params;
    opts.json = true;
  } else {
    opts.qs = params;
  }

  if (params.action === 'wx.api') {
    opts.url = 'https://tcb-open.tencentcloudapi.com/admin'
  }

  if (args.proxy) {
    opts.proxy = args.proxy;
  }

  opts.url = `${opts.url}?eventId=${eventId}`

  // console.log(JSON.stringify(opts));
  return new Promise(function (resolve, reject) {
    request(opts, function (err, response, body) {
      // console.log(err, body);
      args && args.callback && args.callback(response)

      if (err === null && response.statusCode == 200) {
        let res;
        try {
          res = typeof body === "string" ? JSON.parse(body) : body;
        } catch (e) {
          res = body;
        }
        return resolve(res);
      } else {
        return reject(err);
      }
    });
  });
};

}, function(modId) { var map = {"./auth.js":1540477685987}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1540477685987, function(require, module, exports) {
var crypto = require("crypto");

function camSafeUrlEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}
function map(obj, fn) {
  var o = isArray(obj) ? [] : {};
  for (var i in obj) {
    if (obj.hasOwnProperty(i)) {
      o[i] = fn(obj[i], i);
    }
  }
  return o;
}
function isArray(arr) {
  return arr instanceof Array;
}

function clone(obj) {
  return map(obj, function(v) {
    return typeof v === "object" && v !== undefined && v !== null
      ? clone(v)
      : v;
  });
}
//测试用的key后面可以去掉
var getAuth = function(opt) {
  //   console.log(opt);
  opt = opt || {};

  var SecretId = opt.SecretId;
  var SecretKey = opt.SecretKey;
  var method = (opt.method || opt.Method || "get").toLowerCase();
  var pathname = opt.pathname || "/";
  var queryParams = clone(opt.Query || opt.params || {});
  var headers = clone(opt.Headers || opt.headers || {});
  pathname.indexOf("/") !== 0 && (pathname = "/" + pathname);

  if (!SecretId) return console.error("missing param SecretId");
  if (!SecretKey) return console.error("missing param SecretKey");

  var getObjectKeys = function(obj) {
    var list = [];
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (obj[key] === undefined) {
          continue;
        }
        list.push(key);
      }
    }
    return list.sort();
  };

  var obj2str = function(obj) {
    var i, key, val;
    var list = [];
    var keyList = getObjectKeys(obj);
    for (i = 0; i < keyList.length; i++) {
      key = keyList[i];
      if (obj[key] === undefined) {
        continue;
      }
      val = obj[key] === null ? "" : obj[key];
      if (typeof val !== "string") {
        val = JSON.stringify(val);
      }
      key = key.toLowerCase();
      key = camSafeUrlEncode(key);
      val = camSafeUrlEncode(val) || "";
      list.push(key + "=" + val);
    }
    return list.join("&");
  };

  // 签名有效起止时间
  var now = parseInt(new Date().getTime() / 1000) - 1;
  var exp = now;

  var Expires = opt.Expires || opt.expires;
  if (Expires === undefined) {
    exp += 900; // 签名过期时间为当前 + 900s
  } else {
    exp += Expires * 1 || 0;
  }

  // 要用到的 Authorization 参数列表
  var qSignAlgorithm = "sha1";
  var qAk = SecretId;
  var qSignTime = now + ";" + exp;
  var qKeyTime = now + ";" + exp;
  var qHeaderList = getObjectKeys(headers)
    .join(";")
    .toLowerCase();
  var qUrlParamList = getObjectKeys(queryParams)
    .join(";")
    .toLowerCase();

  // 签名算法说明文档：https://www.qcloud.com/document/product/436/7778
  // 步骤一：计算 SignKey
  var signKey = crypto
    .createHmac("sha1", SecretKey)
    .update(qKeyTime)
    .digest("hex");

  // console.log("queryParams", queryParams);
  // console.log(obj2str(queryParams));

  // 步骤二：构成 FormatString
  var formatString = [
    method,
    pathname,
    obj2str(queryParams),
    obj2str(headers),
    ""
  ].join("\n");

  // console.log(formatString);
  formatString = Buffer.from(formatString, "utf8");

  // 步骤三：计算 StringToSign
  var sha1Algo = crypto.createHash("sha1");
  sha1Algo.update(formatString);
  var res = sha1Algo.digest("hex");
  var stringToSign = ["sha1", qSignTime, res, ""].join("\n");

  // console.log(stringToSign);
  // 步骤四：计算 Signature
  var qSignature = crypto
    .createHmac("sha1", signKey)
    .update(stringToSign)
    .digest("hex");

  // 步骤五：构造 Authorization
  var authorization = [
    "q-sign-algorithm=" + qSignAlgorithm,
    "q-ak=" + qAk,
    "q-sign-time=" + qSignTime,
    "q-key-time=" + qKeyTime,
    "q-header-list=" + qHeaderList,
    "q-url-param-list=" + qUrlParamList,
    "q-signature=" + qSignature
  ].join("&");

  return authorization;
};

exports.getAuth = getAuth;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1540477685988, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request_1 = require("./request");
const validate_1 = require("./validate");
const util_1 = require("./util");
const command_1 = require("./command");
const isRegExp = require("is-regex");
class Query {
    constructor(db, coll, fieldFilters, fieldOrders, queryOptions) {
        this._db = db;
        this._coll = coll;
        this._fieldFilters = fieldFilters;
        this._fieldOrders = fieldOrders || [];
        this._queryOptions = queryOptions || {};
        this._request = new request_1.Request(this._db);
    }
    get() {
        let newOder = [];
        if (this._fieldOrders) {
            this._fieldOrders.forEach(order => {
                newOder.push(order);
            });
        }
        let param = {
            collectionName: this._coll
        };
        if (this._fieldFilters) {
            param.query = this._fieldFilters;
        }
        if (newOder.length > 0) {
            param.order = newOder;
        }
        if (this._queryOptions.offset) {
            param.offset = this._queryOptions.offset;
        }
        if (this._queryOptions.limit) {
            param.limit =
                this._queryOptions.limit < 100 ? this._queryOptions.limit : 100;
        }
        else {
            param.limit = 100;
        }
        if (this._queryOptions.projection) {
            param.projection = this._queryOptions.projection;
        }
        return new Promise(resolve => {
            this._request.send("queryDocument", param).then(res => {
                if (res.code) {
                    resolve(res);
                }
                else {
                    const documents = util_1.Util.formatResDocumentData(res.data.list);
                    const result = {
                        data: documents,
                        requestId: res.requestId
                    };
                    if (res.TotalCount)
                        result.total = res.TotalCount;
                    if (res.Limit)
                        result.limit = res.Limit;
                    if (res.Offset)
                        result.offset = res.Offset;
                    resolve(result);
                }
            });
        });
    }
    count() {
        let param = {
            collectionName: this._coll
        };
        if (this._fieldFilters) {
            param.query = this._fieldFilters;
        }
        return new Promise(resolve => {
            this._request.send("countDocument", param).then(res => {
                if (res.code) {
                    resolve(res);
                }
                else {
                    resolve({
                        requestId: res.requestId,
                        total: res.data.total
                    });
                }
            });
        });
    }
    where(query) {
        return new Query(this._db, this._coll, this.convertParams(query), this._fieldOrders, this._queryOptions);
    }
    orderBy(fieldPath, directionStr) {
        validate_1.Validate.isFieldPath(fieldPath);
        validate_1.Validate.isFieldOrder(directionStr);
        const newOrder = {
            field: fieldPath,
            direction: directionStr
        };
        const combinedOrders = this._fieldOrders.concat(newOrder);
        return new Query(this._db, this._coll, this._fieldFilters, combinedOrders, this._queryOptions);
    }
    limit(limit) {
        validate_1.Validate.isInteger("limit", limit);
        let option = Object.assign({}, this._queryOptions);
        option.limit = limit;
        return new Query(this._db, this._coll, this._fieldFilters, this._fieldOrders, option);
    }
    skip(offset) {
        validate_1.Validate.isInteger("offset", offset);
        let option = Object.assign({}, this._queryOptions);
        option.offset = offset;
        return new Query(this._db, this._coll, this._fieldFilters, this._fieldOrders, option);
    }
    update(data) {
        if (!data || typeof data !== "object") {
            return Promise.resolve({
                code: 'INVALID_PARAM',
                message: '参数必需是非空对象'
            });
        }
        if (data.hasOwnProperty('_id')) {
            return Promise.resolve({
                code: 'INVALID_PARAM',
                message: '不能更新_id的值'
            });
        }
        let param = {
            collectionName: this._coll,
            query: this._fieldFilters,
            multi: true,
            merge: true,
            upsert: false,
            data: util_1.Util.encodeDocumentDataForReq(data, true)
        };
        return new Promise(resolve => {
            this._request.send("updateDocument", param).then(res => {
                if (res.code) {
                    resolve(res);
                }
                else {
                    resolve({
                        requestId: res.requestId,
                        updated: res.data.updated,
                        upsertId: res.data.upsert_id
                    });
                }
            });
        });
    }
    field(projection) {
        for (let k in projection) {
            if (projection[k]) {
                projection[k] = 1;
            }
            else {
                projection[k] = 0;
            }
        }
        let option = Object.assign({}, this._queryOptions);
        option.projection = projection;
        return new Query(this._db, this._coll, this._fieldFilters, this._fieldOrders, option);
    }
    remove() {
        const param = {
            collectionName: this._coll,
            query: this._fieldFilters,
            multi: true
        };
        return new Promise(resolve => {
            this._request.send("deleteDocument", param).then(res => {
                if (res.code) {
                    resolve(res);
                }
                else {
                    resolve({
                        requestId: res.requestId,
                        deleted: res.data.deleted
                    });
                }
            });
        });
    }
    convertParams(query) {
        let queryParam = {};
        if (query instanceof command_1.Command) {
            queryParam = query.parse();
        }
        else {
            for (let key in query) {
                if (query[key] instanceof command_1.Command) {
                    queryParam = Object.assign({}, queryParam, query[key].parse(key));
                }
                else if (isRegExp(query[key])) {
                    queryParam = {
                        [key]: {
                            $regex: query[key].source,
                            $options: query[key].flags
                        }
                    };
                }
                else if (typeof query[key] === "object") {
                    let command = new command_1.Command();
                    let tmp = {};
                    command.concatKeys({ [key]: query[key] }, '', tmp);
                    let keys = Object.keys(tmp)[0];
                    let value = tmp[keys];
                    if (value instanceof command_1.Command) {
                        value = value.parse(keys);
                    }
                    else {
                        value = { [keys]: value };
                    }
                    queryParam = Object.assign({}, queryParam, value);
                }
                else {
                    queryParam = Object.assign({}, queryParam, { [key]: query[key] });
                }
            }
        }
        return queryParam;
    }
}
exports.Query = Query;

}, function(modId) { var map = {"./request":1540477685985,"./validate":1540477685978,"./util":1540477685980,"./command":1540477685981}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1540477685989, function(require, module, exports) {
const httpRequest = require("../utils/httpRequest");

/**
 * 调用云函数
 * @param {String} name  函数名
 * @param {Object} functionParam 函数参数
 * @return {Promise}
 */
function callFunction({ name, data }) {
  try {
    data = data ? JSON.stringify(data) : "";
  } catch (e) {
    return Promise.reject(e);
  }
  if (!name) {
    return Promise.reject(
      new Error({
        message: "函数名不能为空"
      })
    );
  }

  let params = {
    action: "functions.invokeFunction",
    function_name: name,
    request_data: data
  };

  return httpRequest({
    config: this.config,
    params,
    method: "post",
    headers: {
      "content-type": "application/json"
    }
  }).then(res => {
    // console.log(res);
    if (res.code) {
      return res;
    } else {
      let result = res.data.response_data
      try {
        result = JSON.parse(res.data.response_data)
      } catch (e) { }
      return {
        result,
        requestId: res.requestId
      };
    }
  });
}

exports.callFunction = callFunction;

}, function(modId) { var map = {"../utils/httpRequest":1540477685986}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1540477685990, function(require, module, exports) {
const httpRequest = require("../utils/httpRequest");

exports.callWxOpenApi = function ({ apiName, requestData } = {}) {
    try {
        requestData = requestData ? JSON.stringify(requestData) : "";
    } catch (e) {
        throw Error(e)
    }

    const wxCloudApiToken = process.env.WX_API_TOKEN || ''

    let params = {
        action: "wx.api",
        apiName,
        requestData,
        wxCloudApiToken
    };

    return httpRequest({
        config: this.config,
        params,
        method: "post",
        headers: {
            "content-type": "application/json"
        }
    }).then(res => {
        // console.log(res);
        if (res.code) {
            return res;
        } else {
            let result = res.data.responseData
            try {
                result = JSON.parse(res.data.responseData)
            } catch (e) { }
            return {
                result,
                requestId: res.requestId
            };
        }
    });
}

}, function(modId) { var map = {"../utils/httpRequest":1540477685986}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1540477685972);
})()
//# sourceMappingURL=index.js.map