var async = require('async');
var leveldb = require('levelup');
var Model = require('./model');

module.exports = LevelDBAdapter;

LevelDBAdapter.connectionPool = {};

LevelDBAdapter.encoders = {};
LevelDBAdapter.encoders.date     =
LevelDBAdapter.encoders.datetime =
LevelDBAdapter.encoders.time     = function (v, o, d) {
  return d(null, v.getTime());
};

LevelDBAdapter.decoders = {};
LevelDBAdapter.decoders.date     =
LevelDBAdapter.decoders.datetime =
LevelDBAdapter.decoders.time     = function (v, o, d) {
  return d(null, new Date(v));
};

LevelDBAdapter.validators = {};

function LevelDBAdapter(config) {
  Model.call(this, this.config = config);
  this.entity    = config.entity;
  this.container = config.container;
  this.schema    = config.schema || this.container.get(this.entity + '/schema');
  this.validator = this.container.get('validator', LevelDBAdapter.validators);
  this.encoder   = this.container.get('encoder', LevelDBAdapter.encoders);
  this.decoder   = this.container.get('decoder', LevelDBAdapter.decoders);
}

LevelDBAdapter.prototype = Object.create(Model.prototype);

LevelDBAdapter.prototype.connect = function (callback) {
  callback(null, this.client = 
    LevelDBAdapter.connectionPool[this.config.path] = 
    LevelDBAdapter.connectionPool[this.config.path] ||
    leveldb(this.config.path, { 
      valueEncoding: 'json' 
  }));
};

LevelDBAdapter.prototype.disconnect = function (callback) { 
  this.client.close(callback); 
};

LevelDBAdapter.prototype.migrate = function (callback) { 
  return callback(null); 
};

LevelDBAdapter.prototype._put = function (id, model, options, callback) {
  var self = this;
  this.encoder.transcode(model, this.schema, function (err, values) {
    if (err) return callback(err);
    self.client.put(id, values, function (err) { 
      callback(err, id); 
    });
  });
};

LevelDBAdapter.prototype._get = function (id, options, callback) { 
  var self = this;
  var schema = this.schema;
  var decoder = this.decoder;

  if (id === 'undefined') {
    var query = options ? options.query : undefined;
    var range = options ? options.range : undefined;
    var c = [];

    return this.client.createValueStream()
      .on("data", function (record) {
        if (query) {
          for (var key in query) {
            if (record[key] !== query[key]) return;
          }
        }
        c.push(record);
      }).on("end", function () {
        async.map(c, function (item, done) { 
          decoder.transcode(item, schema, done);
        }, callback);
      }); 
  }

  this.client.get(id, function (err, value) {
    if (err) return callback(err);
    decoder.transcode(value, schema, callback);
  });
};

LevelDBAdapter.prototype._del = function (id, options, callback) { 
  this.client.del(id, callback); 
};