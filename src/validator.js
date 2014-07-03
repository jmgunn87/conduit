var async = require('async');
var _ = require('lodash');
var Model = require('./model');

module.exports = Validator;

function Validator (config) { Model.call(this, config); }

Validator.prototype = Object.create(Model.prototype);

Validator.prototype.validate = function (value, schema, done) {
  var self = this;
  var hasError = null;

  if (!value || !schema || !schema.fields) return done(null);
  
  async.parallel(_.reduce(schema.fields, function (reduction, field, key) {
    reduction[key] = function (callback) {
      var validator = self.get(field.type);
      if (!validator) return callback();

      try {
        validator(value[key], field, function (err) {
          hasError = !!err;
          callback(null, err);
        });
      } catch (err) {
        hasError = true;
        callback(err);
      }
    };
    return reduction;
  }, {}), function (err, result) {
    return done(hasError || null, result);
  });
};
