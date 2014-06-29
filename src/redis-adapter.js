var async = require('async');
var redis = require('redis');
var Adapter = require('./adapter');

module.exports = RedisAdapter;

function RedisAdapter(config) {
  Adapter.call(this, config);
}

RedisAdapter.prototype = Object.create(Adapter.prototype);

RedisAdapter.prototype.encoders = Object.create(Adapter.prototype.encoders);
RedisAdapter.prototype.encoders._default = function (v, o, d) {
  return d(null, JSON.stringify(v));
};
RedisAdapter.prototype.encoders.date     =
RedisAdapter.prototype.encoders.datetime =
RedisAdapter.prototype.encoders.time     = function (v, o, d) {
  return d(null, v.getTime().toString());
};

RedisAdapter.prototype.decoders = Object.create(Adapter.prototype.decoders);
RedisAdapter.prototype.decoders._default = function (v, o, d) {
  return d(null, typeof v == 'string' ? JSON.parse(v) : v);
};
RedisAdapter.prototype.decoders.date     =
RedisAdapter.prototype.decoders.datetime =
RedisAdapter.prototype.decoders.time     = function (v, o, d) {
  return d(null, new Date(parseInt(v, 10)));
};

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
  var client = this.client;

  this.encoder.transcode(model, schema, function (err, values) {
    if (err) return callback(err);
    client.hmset(entity + '/id/' + id, values, function (err) {
      if (err) return callback(err);
      callback(null, id);
    });
  });
};

RedisAdapter.prototype._get = function (id, options, callback) { 
  var self = this;
  var entity = this.entity;
  var schema = this.schema;
  var decoder = this.decoder;

  this.client.hgetall(entity + '/id/' + id, function (err, value) {
    if (err) return callback(err);
    decoder.transcode(value, schema, callback);
  });
};

RedisAdapter.prototype._del = function (id, options, callback) { 
  var entity = this.entity;
  var fields = this.schema.fields;
  this.client.hdel(entity + '/id/' + id, Object.keys(fields), callback);
};
