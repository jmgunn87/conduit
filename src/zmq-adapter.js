var async = require('async');
var zmq = require('zmq');
var _ = require('lodash');
var Adapter = require('./adapter');

module.exports = ZMQAdapter;

function ZMQAdapter(config) {
  Adapter.call(this, config);
}

ZMQAdapter.prototype = Object.create(Adapter.prototype);

ZMQAdapter.prototype.connect = function (callback) {
  this.socket = zmq.socket('req');
  this.socket.identity = this.config.identity;
  this.socket.connect(this.config.host);
  callback();
};

ZMQAdapter.prototype.disconnect = function (callback) {
  this.socket.close();
  callback();
};

ZMQAdapter.prototype._put = function (id, model, options, callback) {
  var self = this;
  var socket = this.socket;
  
  this.encoder.transcode(model, this.schema, function (err, values) {
    if (err) return callback(err);
    self.exec({ 
      method: 'put', 
      body: values
    }, callback);
  });
};

ZMQAdapter.prototype._get = function (id, options, callback) {
  var self = this;
  var socket = this.socket;
  var schema = this.schema;
  var decoder = this.decoder;
  
  options = options || {};
  if (!options.query && id) {
    options.query = {};
    options.query.id = id; 
  }

  this.exec({
    method: 'get',
    query: options.query,
    id: id,
  }, function (err, data) {
    if (err) return callback(err);
    if(_.isArray(data.body)) {
      async.map(data.body, function (item, done) { 
        decoder.transcode(item, schema, done);
      }, callback);
    } else {
      decoder.transcode(data.body, schema, callback);
    }
  });
};

ZMQAdapter.prototype._del = function (id, options, callback) {
  var self = this;
  var socket = this.socket;
  self.exec({ 
    method: 'del', 
    id: id 
  }, callback);
};

ZMQAdapter.prototype.exec = function (message, callback) {
  var socket = this.socket;
  socket.send(JSON.stringify(message));
  socket.once('error', callback);
  socket.once('message', function(data) {
    socket.removeListener('error', callback);
    callback(null, JSON.parse(data));
  });
};
