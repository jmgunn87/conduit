var Model = require('./model');

module.exports = MemoryAdapter;

MemoryAdapter.encoders = {};
MemoryAdapter.decoders = {};
MemoryAdapter.validators = {};

function MemoryAdapter(config) {
  Model.call(this, this.config = config);
  this.container = config.container;
  this.validator = this.container.get('validator', MemoryAdapter.validators);
  this.encoder = this.container.get('encoder', MemoryAdapter.encoders);
  this.decoder = this.container.get('decoder', MemoryAdapter.decoders);
}

MemoryAdapter.prototype = Object.create(Model.prototype);

MemoryAdapter.prototype.disconnect = 
MemoryAdapter.prototype.connect =
MemoryAdapter.prototype.createTable = 
MemoryAdapter.prototype.dropTable = function (callback) { 
  return callback();
};

MemoryAdapter.prototype._put = function (id, model, options, callback) {
  this.store[id] = model;
  callback(null, id);
};

MemoryAdapter.prototype._get = function (id, options, callback) {
  callback(null, this.store[id]);
};

MemoryAdapter.prototype._del = function (id, options, callback) { 
  callback(null, delete this.store[id]);
};
