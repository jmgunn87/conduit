var async = require('async');
var _ = require('lodash');
var Model = require('./model');

module.exports = Transcoder;

function Transcoder(c) { Model.call(this, c); }

Transcoder.prototype = Object.create(Model.prototype);

Transcoder.prototype.transcode = function (v, s, d) {
  var self = this;
  async.parallel(_.reduce(s.fields, function (r, f, k) {
    r[k] = function (callback) {
      var transcoder = self.get(f.type);
      if (!transcoder) return callback(null, v[k]);
      transcoder(v[k], f, function (e, v) {
        if (e) return callback(e);
        callback(null, v);
      });
    };
    return r;
  }, {}), function (err, result) {
    if (err) return d(err);
    return d(null, result);
  });
};
