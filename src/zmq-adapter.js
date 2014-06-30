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
  if (this.socket) this.socket.close();
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
  this.exec({ method: 'put', body: model }, function (err) {
    if (err) return callback(err);
    callback(null, id);
  });
};

ZMQAdapter.prototype._get = function (id, options, callback) {
  options = options || {};
  if (!options.query && id) {
    options.query = {};
    options.query.id = id; 
  }

  this.exec({ method: 'get', query: options.query, id: id }, function (err, data) {
    if (err) return callback(err);
    callback(null, data.body);
  });
};

ZMQAdapter.prototype._del = function (id, options, callback) {
  this.exec({ method: 'del', id: id }, callback);
};

ZMQAdapter.prototype.exec = function (message, callback) {
  var socket = this.socket;
  socket.send(JSON.stringify(message));
  socket.once('error', callback);
  socket.once('message', function(data) {
    socket.removeListener('error', callback);
    callback(null, JSON.parse(data.toString()));
  });
};
