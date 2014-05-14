var async = require('async');
var _ = require('lodash');
var Model = require('./model');

module.exports = Validator;

function Validator (c) { Model.call(this, c); }

Validator.prototype = Object.create(Model.prototype);

Validator.prototype.validate = function (v, s, d) {
  var self = this;
  var hasError = null;
  async.parallel(_.reduce(s.fields, function (r, f, k) {
    r[k] = function (callback) {
      var validator = self.get(f.type);
      if (!validator) return callback();
      validator(v[k], f, function (err) {
        hasError = !!err;
        callback(null, err);
      });
    };
    return r;
  }, {}), function (err, result) {
    return d(hasError || null, result);
  });
};
