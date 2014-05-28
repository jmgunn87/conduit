var async = require('async');
var _ = require('lodash');
var Model = require('./model');

module.exports = Transcoder;

function Transcoder(config) { Model.call(this, config); }

Transcoder.prototype = Object.create(Model.prototype);

Transcoder.prototype.transcode = function (value, schema, done) {
  var self = this;
  async.parallel(_.reduce(schema.fields, function (reduction, field, key) {
    reduction[key] = function (callback) {
      var transcoder = self.get(field.type);
      if (!transcoder) return callback(null, value[key]);
      transcoder(value[key], field, function (err, value) {
        if (err) return callback(err);
        callback(null, value);
      });
    };
    return reduction;
  }, {}), function (err, result) {
    if (err) return done(err);
    return done(null, result);
  });
};
