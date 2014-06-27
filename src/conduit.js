var async = require('async');
var _ = require('lodash');
var Container = require('./container');
var Validator = require('./validator');
var Transcoder = require('./transcoder');
var Mapper = require('./mapper');

module.exports = Conduit;

function Conduit(config) {
  Container.call(this, config);
  this.put('validator', function (params) { return new Validator(params); });
  this.put('encoder', function (params) { return new Transcoder(params); });
  this.put('decoder', function (params) { return new Transcoder(params); });
  this.put('mapper', function (params) { 
    return new Mapper(params); 
  }, true);
}

Conduit.prototype = Object.create(Container.prototype);

Conduit.prototype.registerSchema = function (key, value, done) {
  return this.put(key + '/schema', value, null);
};

Conduit.prototype.registerModel = function (key, value, done) {
  return this.put(key + '/model', function (p) {
    var instance = new value(p);
    instance.put(p);
    return instance;
  }, done);
};

Conduit.prototype.registerAdapter = function (key, value, done) {
  return this.put(key + '/adapter', function (p) {
    return new value(p);
  }, true, done);
};

Conduit.prototype.assemble = function (done) {
  var self = this;
  var store = this.store;
  async.parallel(_.reduce(store, function (result, value, key) {
    result[key] = function (done) {
      if (/\/schema$/.test(key) && value.inherits) {
        self.applyInheritance(value);
        done();
      } else if (/\/adapter$/.test(key)) {
        self.get(key).connect(done);
      } else {
        done();
      }
    };
    return result;
  }, {}), done);
};

Conduit.prototype.applyInheritance = function (schema) {
  var parent = this.get(schema.inherits + '/schema');
  if (parent.inherits) this.applyInheritance(parent);
  for (var field in parent.fields) {
    schema.fields[field] = 
      schema.fields[field] || 
        parent.fields[field];
  }
};