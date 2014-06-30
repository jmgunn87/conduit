var async = require('async');
var _ = require('lodash');
var request = require('request');
var Adapter = require('./adapter');

module.exports = RestJsonAdapter;

function RestJsonAdapter(config) {
  Adapter.call(this, config);
}

RestJsonAdapter.prototype = Object.create(Adapter.prototype);

RestJsonAdapter.prototype._put = function (id, model, options, callback) {
  var path = this.config.path;
  request.put(path + '/' + id, { json: model }, function (err, res, body) {
    callback(err, body ? body.id : undefined);
  });
};

RestJsonAdapter.prototype._get = function (id, options, callback) { 
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
    callback(null, body);
  });
};

RestJsonAdapter.prototype._del = function (id, options, callback) { 
  request.get(this.config.path + '/' + id,
    function (err, res, body) {
      callback(err);
    });
};