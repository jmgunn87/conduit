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
  var batch = client.multi();
  var keyname = entity + '/id/' + id;

  client.hgetall(keyname, function (err, previous) {
    if (err) return callback(err);
    self._iterateIndexes(model, function (key, value) {
      batch.sadd([entity, key, value].join('/'), id);
    }, function () {
      self._iterateIndexes(previous, function (key, value) {
        if (model[key] !== value) {
          batch.srem([entity, key, value].join('/'), id);
        }
      }, function () {
        batch.hmset(keyname, model);
        batch.exec(function (err) {
          if (err) return callback(err);
          callback(null, id);
        });
      });
    });
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
  var self = this;
  var entity = this.entity;
  var batch = this.client.multi();
  var keyname = entity + '/id/' + id;

  this.client.hgetall(keyname, function (err, values) {
    if (err) return callback(err);
    self._iterateIndexes(values, function (key, value) {
      batch.srem([entity, key, value].join('/'), id);
    }, function () {
      batch.del(keyname);
      batch.exec(callback);
    });
  });
};

RedisAdapter.prototype._iterateIndexes = function (values, iterator, callback) {
  if (!values) return callback();

  var fields = this.schema.fields;
  for (var key in fields) {
    var field = fields[key];
    if (!values[key]) continue;
    if (field.index || field.type === 'entity') {
      switch(field.type) {
        case 'array':
        case 'object':
          break;
        default:
          iterator(key, values[key]);
      }
    }
  } 
  callback();
};
