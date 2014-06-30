var _ = require('lodash');
var async = require('async');
var MongoClient = require('mongodb').MongoClient;
var Adapter = require('./adapter');

module.exports = MongoDBAdapter;

function MongoDBAdapter(config) {
  Adapter.call(this, config);
  this.config = config;
}

MongoDBAdapter.prototype = Object.create(Adapter.prototype);

MongoDBAdapter.prototype.connect = function (callback) {
  var self = this;
  MongoClient.connect([
    'mongodb://',
    self.config.host, ':',
    self.config.port, '/',
    self.config.dbname
  ].join(''), function (err, client) {
    if (err) return callback(err);
    self.client = client;
    self.collection = client.collection(self.entity);
    callback();
  });
};

MongoDBAdapter.prototype.disconnect = function (callback) {
  this.client.close();
  callback();
};

MongoDBAdapter.prototype._put = function (id, model, options, callback) {
  this.collection.update({ id: id }, { $set: model}, { w:1, upsert: true }, function (err) {
    if (err) return callback(err);
    callback(null, id);
  });
};

MongoDBAdapter.prototype._get = function (id, options, callback) {
  var self = this;
  var schema = this.schema;
  
  options = options || {};
  if (!options.query && id) {
    options.query = {};
    options.query.id = id; 
  }
  
  this.collection.find(options.query, function (err, docs) {
    if (err) return callback(err);
    docs.toArray(function (err, models) {
      if (err) return callback(err);
      callback(null, models.length === 1 ? models[0] : models);
    });
  });
};

MongoDBAdapter.prototype._del = function (id, options, callback) {
  this.collection.remove({ id: id }, callback);
};

