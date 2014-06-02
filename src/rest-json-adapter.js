var async = require('async');
var _ = require('lodash');
var request = require('request');
var Adapter = require('./adapter');

module.exports = RestJsonAdapter;

function RestJsonAdapter(config) {
  Adapter.call(this, config);
}

RestJsonAdapter.prototype = Object.create(Adapter.prototype);

RestJsonAdapter.prototype.connect    =
RestJsonAdapter.prototype.disconnect =
RestJsonAdapter.prototype.migrate    = function (callback) { 
  callback(null); 
};

RestJsonAdapter.prototype._put = function (id, model, options, callback) {
  var self = this;
  var path = this.config.path;

  this.encoder.transcode(model, this.schema, function (err, values) {
    if (err) return callback(err);
    request.put(path + '/' + id, {
      json: values
    }, function (err, res, body) {
      callback(err, body ? body.id : undefined);
    });
  });
};

RestJsonAdapter.prototype._get = function (id, options, callback) { 
  var schema = this.schema;
  var decoder = this.decoder;
  
  options = options || {};
  if (!options.query && id) {
    options.query = {};
    options.query.id = id; 
  }

  request.get(this.config.path + '/' + (id||''), {
    query: options.query,
    json: true
  }, function (err, res, body) {
    if (err) return callback(err);
    if(_.isArray(body)) {
      async.map(body, function (item, done) { 
        decoder.transcode(body, schema, done);
      }, callback);
    } else {
      decoder.transcode(body, schema, callback);
    }
  });
};

RestJsonAdapter.prototype._del = function (id, options, callback) { 
  request.get(this.config.path + '/' + id,
    function (err, res, body) {
      callback(err);
    });
};