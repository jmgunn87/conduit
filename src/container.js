var Model = require('./model');

function Container(c) { Model.call(this, c); }

Container.prototype = Object.create(Model.prototype);

Container.prototype._put = function (i, v, o, d) {
  return d(null, this.store[i] = !o ? v : function (p) {
    this.c = this.c || {};
    return this.c[i] = this.c[i] || v(p);
  });
};

Container.prototype._get = function (i, o, d) {
  o = o || {};
  o.container = this;
  return d(null, typeof this.store[i] === 'function' ?
    this.store[i](o) : this.store[i]);
};

module.exports = Container;
