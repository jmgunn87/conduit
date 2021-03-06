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

LevelDBAdapter.prototype._put = function (id, model, options, callback) {
  var self = this;
  var entity = this.entity;
  var schema = this.schema;
  var batch = this.client.batch();
  var keyname = entity + '/id/' + id;

  this.client.get(keyname, function (err, previous) {
    self._iterateIndexes(model, function (key, value) {
      batch.put([entity, key, value, id].join('/'), id, {
        valueEncoding: 'utf8'
      });
    }, function () {
      self._iterateIndexes(previous, function (key, value) {
        if (model[key] !== value) {
          batch.del([entity, key, value, id].join('/'));
        }
      }, function () {
        batch.put(keyname, model); 
        batch.write(function (err) {
          callback(err, id); 
        });
      });
    });
  });
};

LevelDBAdapter.prototype._get = function (id, options, callback) { 
  var self = this;
  var entity = this.entity;
  var schema = this.schema;

  if (!id) {
    var batch = [];
    var err, result = [];
    var query = {};
    query.start = options ? options.offset : undefined;
    query.limit = options ? options.limit : undefined;
    query.end = query.start ? query.start + "\xff" : undefined;

    return this.client.createReadStream(query)
      .on("data", function (record) {
        switch(typeof record.value) {
          case 'object':
            result.push(record.value);
            break;
          default:
            batch.push(record.value);
        }
      }).on("error", function (e) {
        err = e;
      }).on("end", function () {
        if (err) return callback(err);
        async.map(batch, function (id, done) {
          self._get(id, null, done);
        }, function (err, fetched) {
          if (err) return callback(err);
          callback(null, result.concat(fetched)); 
        });
      }); 
  }

  this.client.get(entity + '/id/' + id, callback);
};

LevelDBAdapter.prototype._del = function (id, options, callback) { 
  var self = this;
  var entity = this.entity;
  var fields = this.schema.fields;
  var batch = this.client.batch();

  this.client.get(entity + '/id/' + id, function (err, values) {
    if (err) return callback(err);
    self._iterateIndexes(values, function (key, value) {
      batch.del([entity, key, value, id].join('/'));
    }, function () {
      batch.del(entity + '/id/' + id, values); 
      batch.write(callback);
    });
  });
};

LevelDBAdapter.prototype._iterateIndexes = function (values, iterator, callback) {
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