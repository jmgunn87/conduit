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
  return this.put(key + '/model', typeof value === 'function' ? value : function (p) {
    return new value(p);
  }, done);
};

Conduit.prototype.registerAdapter = function (key, value, done) {
  return this.put(key + '/adapter', typeof value === 'function' ? value : function (p) {
    return new value(p);
  }, true, done);
};