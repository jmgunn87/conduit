var async = require('async');
var redis = require('redis');
var Adapter = require('./adapter');

module.exports = RedisAdapter;

function RedisAdapter(config) {
  Adapter.call(this, config);
}

RedisAdapter.prototype = Object.create(Adapter.prototype);

RedisAdapter.prototype.connect = function (callback) {
  this.client = redis.createClient(
    this.config.port, 
    this.config.host, 
    this.config
  );
  this.client.once('ready', callback);
  this.client.once('error', callback);
};

RedisAdapter.prototype.disconnect = function (callback) { 
  this.client.end(); 
  callback(null);
};

RedisAdapter.prototype._put = function (id, model, options, callback) {
  var self = this;
  var entity = this.entity;
  var schema = this.schema;

  this.encoder.transcode(model, schema, function (err, values) {
    if (err) return callback(err);
  });
};

RedisAdapter.prototype._get = function (id, options, callback) { 
  var self = this;
  var entity = this.entity;
  var schema = this.schema;
  var decoder = this.decoder;

  if (!id) {
  }

  this.client.get(entity + '/id/' + id, function (err, value) {
    if (err) return callback(err);
    decoder.transcode(value, schema, callback);
  });
};

RedisAdapter.prototype._del = function (id, options, callback) { 
  var entity = this.entity;
  var fields = this.schema.fields;
  var batch = this.client.batch();

  this.client.get(entity + '/id/' + id, function (err, values) {
    if (err) return callback(err);
  });
};
