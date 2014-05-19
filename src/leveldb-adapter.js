var Model = require('./model');
var leveldb = require('levelup');

module.exports = LevelDBAdapter;

LevelDBAdapter.connectionPool = {};
LevelDBAdapter.encoders = {};
LevelDBAdapter.decoders = {};
LevelDBAdapter.validators = {};

function LevelDBAdapter(config) {
  Model.call(this, this.config = config);
  this.container = config.container;
  this.validator = this.container.get('validator', LevelDBAdapter.validators);
  this.encoder = this.container.get('encoder', LevelDBAdapter.encoders);
  this.decoder = this.container.get('decoder', LevelDBAdapter.decoders);
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

LevelDBAdapter.prototype.createTable = 
LevelDBAdapter.prototype.dropTable = function (callback) { 
  return callback(null); 
};

LevelDBAdapter.prototype._put = function (id, model, options, callback) {
  this.client.put(id, model, function (e) { callback(e, id); }); 
};

LevelDBAdapter.prototype._get = function (id, options, callback) { 
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
        callback(null, c); 
      }); 
  }
  this.client.get(id, callback); 
};

LevelDBAdapter.prototype._del = function (id, options, callback) { 
  this.client.del(id, callback); 
};