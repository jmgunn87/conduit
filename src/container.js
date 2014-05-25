var Model = require('./model');

function Container(config) { Model.call(this, config); }

Container.prototype = Object.create(Model.prototype);

Container.prototype._put = function (key, value, options, done) {
  return done(null, this.store[key] = !options ? value : function (params) {
    this.cached = this.cached || {};
    return this.cached[key] =
      this.cached[key] || value(params);
  });
};

Container.prototype._get = function (key, options, done) {
  options = options || {};
  options.container = this;
  return done(null, typeof this.store[key] === 'function' ?
    this.store[key](options) : this.store[key]);
};

module.exports = Container;
