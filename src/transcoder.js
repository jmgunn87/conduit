var async = require('async');
var _ = require('lodash');
var Model = require('./model');

module.exports = Transcoder;

function Transcoder(config) { Model.call(this, config); }

Transcoder.prototype = Object.create(Model.prototype);

Transcoder.prototype.transcode = function (value, schema, done) {
  var self = this;

  if (!value) return done(null, value);

  async.parallel(_.reduce(schema.fields, function (reduction, field, key) {
    reduction[key] = function (callback) {
      var transcoder = self.get(field.type) || self.get('_default');
      if (!transcoder) return callback(null, value[key]);
      if (typeof value[key] === 'undefined') return callback();
      transcoder(value[key], field, function (err, value) {
        if (err) return callback(err);
        callback(null, value);
      });
    };
    return reduction;
  }, {}), function (err, result) {
    return err ? done(err) : done(null, result);
  });
};
