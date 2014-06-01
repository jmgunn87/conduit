var request = require('request');
var Model = require('./model');

module.exports = RestJsonAdapter;

RestJsonAdapter.encoders = {};
RestJsonAdapter.decoders = {};
RestJsonAdapter.validators = {};

function RestJsonAdapter(config) {
  Model.call(this, this.config = config);
  this.container = config.container;
  this.validator = this.container.get('validator', RestJsonAdapter.validators);
  this.encoder = this.container.get('encoder', RestJsonAdapter.encoders);
  this.decoder = this.container.get('decoder', RestJsonAdapter.decoders);
}

RestJsonAdapter.prototype = Object.create(Model.prototype);

RestJsonAdapter.prototype.connect = 
RestJsonAdapter.prototype.disconnect =
RestJsonAdapter.prototype.migrate = function (callback) { 
  callback(null); 
};

RestJsonAdapter.prototype._put = function (id, model, options, callback) {
  this.client.put(id, model, function (e) { callback(e, id); }); 
};

RestJsonAdapter.prototype._get = function (id, options, callback) { 
  if (id === 'undefined') {
  }
  this.client.get(id, callback); 
};

RestJsonAdapter.prototype._del = function (id, options, callback) { 
  this.client.del(id, callback); 
};