var async = require('async');
var leveldb = require('levelup');
var Adapter = require('./adapter');

module.exports = LevelDBAdapter;

function LevelDBAdapter(config) {
  Adapter.call(this, config);
}

LevelDBAdapter.prototype = Object.create(Adapter.prototype);

LevelDBAdapter.prototype.connectionPool = {};

LevelDBAdapter.prototype.connect = function (callback) {
  callback(null, this.client = 
    this.connectionPool[this.config.path] = 
    this.connectionPool[this.config.path] ||
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

  if (!id) {
    var query = options ? options.query : undefined;
    var range = options ? options.range : undefined;
    var result = [];

    return this.client.createValueStream()
      .on("data", function (record) {
        if (query) {
          for (var key in query) {
            if (record[key] !== query[key]) return;
          }
        }
        result.push(record);
      }).on("end", function () {
        async.map(result, function (item, done) { 
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