var async = require('async');
var _ = require('lodash');
var Model = require('./model');

module.exports = Validator;

function Validator (config) { Model.call(this, config); }

Validator.prototype = Object.create(Model.prototype);

Validator.prototype.validate = function () {
  return this._dispatch('validate', 
    Array.prototype.slice.call(arguments, 0)
  ); 
};

Validator.prototype._validate = function (key, value, done) {
  var field = this.schema.fields[key];
  var validator = this.get(field.type) || this.get('_default');
  if (!validator) return done();
  if (typeof value[key] === 'undefined') return done();

  try {
    return validator(value[key], field, done);
  } catch (err) {
    return done(err);
  }
};
