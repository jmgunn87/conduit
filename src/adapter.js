var async = require('async');
var Model = require('./model');

module.exports = Adapter;

function Adapter(config) {
  Model.call(this, this.config = config);
  this.container = config.container;
  this.entity    = config.entity;
  this.schema    = config.schema || this.container.get(this.entity + '/schema');
  this.validator = this.container.get('validator', this.validators);
  this.encoder   = this.container.get('encoder', this.encoders);
  this.decoder   = this.container.get('decoder', this.decoders);
}

Adapter.prototype = Object.create(Model.prototype);

Adapter.prototype.encoders = {};
Adapter.prototype.encoders.date     =
Adapter.prototype.encoders.datetime =
Adapter.prototype.encoders.time     = function (v, o, d) {
  return d(null, v.getTime());
};

Adapter.prototype.decoders = {};
Adapter.prototype.decoders.date     =
Adapter.prototype.decoders.datetime =
Adapter.prototype.decoders.time     = function (v, o, d) {
  return d(null, new Date(v));
};

Adapter.prototype.validators = {};

Adapter.prototype.connect    = 
Adapter.prototype.disconnect =
Adapter.prototype.migrate    = function (callback) { 
  return callback(null); 
};

Adapter.prototype._put = function (id, value, options, callback) {
  this.store[id] = value;
  return callback(null, id);
};

Adapter.prototype._get = function (id, options, callback) { 
  if (!id) {
    var result = [];
    for (var key in this.store) result.push(this.store[key]);
    return callback(null, result);
  }
  callback(null, this.store[id]);
};
