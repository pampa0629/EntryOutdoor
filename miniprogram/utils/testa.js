
// var od = { name: "od" }

function A() {
  this.name = "a";
}

A.prototype.setName = function (name) {
  this.name = name
}

A.prototype.getName = function () {
  return this.name
}

module.exports = {
  A: A,
  setName: A.prototype.setName,
  getName: A.prototype.getName,
}