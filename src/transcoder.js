var async = require('async');
var _ = require('lodash');
var Model = require('./model');

module.exports = Transcoder;

function Transcoder(config) { Model.call(this, config); }

Transcoder.prototype = Object.create(Model.prototype);

Transcoder.prototype.transcode = function (value, schema, done) {
  var self = this;

  if (!value || !schema || !schema.fields) return done(null);

  async.parallel(_.reduce(schema.fields, function (reduction, field, key) {
    reduction[key] = function (callback) {
      var transcoder = self.get(field.type) || self.get('_default');
      if (!transcoder) return callback(null, value[key]);
      if (typeof value[key] === 'undefined') return callback();

      try {
        transcoder(value[key], field, callback);
      } catch (err) {
        callback(err);
      }
    };
    return reduction;
  }, {}), function (err, result) {
    return err ? done(err) : done(null, result);
  });
};
