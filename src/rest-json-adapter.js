var request = require('request');
var Model = require('./model');

module.exports = RestJsonAdapter;

RestJsonAdapter.encoders = {};
RestJsonAdapter.encoders.date     =
RestJsonAdapter.encoders.datetime =
RestJsonAdapter.encoders.time     = function (v, o, d) {
  return d(null, v.getTime());
};

RestJsonAdapter.decoders = {};
RestJsonAdapter.decoders.date     =
RestJsonAdapter.decoders.datetime =
RestJsonAdapter.decoders.time     = function (v, o, d) {
  return d(null, new Date(v));
};

RestJsonAdapter.validators = {};

function RestJsonAdapter(config) {
  Model.call(this, this.config = config);
  this.container = config.container;
  this.validator = this.container.get('validator', RestJsonAdapter.validators);
  this.encoder   = this.container.get('encoder', RestJsonAdapter.encoders);
  this.decoder   = this.container.get('decoder', RestJsonAdapter.decoders);
}

RestJsonAdapter.prototype = Object.create(Model.prototype);

RestJsonAdapter.prototype.connect    =
RestJsonAdapter.prototype.disconnect =
RestJsonAdapter.prototype.migrate    = function (callback) { 
  callback(null); 
};

RestJsonAdapter.prototype._put = function (id, model, options, callback) {
  var self = this;
  this.encoder.transcode(model, this.schema, function (err, values) {
    if (err) return callback(err);
    self.client.put(id, values, function (err) { 
      callback(err, id); 
    });
  });
};

RestJsonAdapter.prototype._get = function (id, options, callback) { 
  this.client.get(id, function (err, value) {
    if (err) return callback(err);
    decoder.transcode(value, schema, callback);
  });
};

RestJsonAdapter.prototype._del = function (id, options, callback) { 
  this.client.del(id, callback); 
};