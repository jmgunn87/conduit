var async = require('async');
var redis = require('redis');
var Adapter = require('./adapter');

module.exports = RedisAdapter;

function RedisAdapter(config) {
  Adapter.call(this, config);
}

RedisAdapter.prototype = Object.create(Adapter.prototype);

RedisAdapter.prototype.encoders = Object.create(Adapter.prototype.encoders);
RedisAdapter.prototype.encoders.boolean  = function (v, o, d) {
  return d(null, +v);
};
RedisAdapter.prototype.encoders.array  =
RedisAdapter.prototype.encoders.object = function (v, o, d) {
  return d(null, JSON.stringify(v));
};
RedisAdapter.prototype.encoders.date     =
RedisAdapter.prototype.encoders.datetime =
RedisAdapter.prototype.encoders.time     = function (v, o, d) {
  return d(null, v.getTime().toString());
};

RedisAdapter.prototype.decoders = Object.create(Adapter.prototype.decoders);
RedisAdapter.prototype.decoders.boolean  = function (v, o, d) {
  return d(null, Boolean(parseInt(v, 10)));
};
RedisAdapter.prototype.decoders.array  =
RedisAdapter.prototype.decoders.object = function (v, o, d) {
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
  var client = this.client;

  client.hmset(entity + '/id/' + id, model, function (err) {
    if (err) return callback(err);
    callback(null, id);
  });
};

RedisAdapter.prototype._get = function (id, options, callback) { 
  var self = this;
  var entity = this.entity;

  this.client.hgetall(entity + '/id/' + id, function (err, value) {
    if (err) return callback(err);
    callback(null, value);
  });
};

RedisAdapter.prototype._del = function (id, options, callback) { 
  var entity = this.entity;
  this.client.del(entity + '/id/' + id, callback);
};
