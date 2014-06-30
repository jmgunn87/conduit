var assert = require('assert');
var zmq = require('zmq');
var ZMQAdapter = require('./../../src/zmq-adapter');
var container = require('./index');

describe('ZMQAdapter', function () {

  var schema = container.get('schemas').TestEntity;
  var values = container.get('seeds').TestEntity[0];

  var db = {};
  var server = zmq.socket('rep');
  server.identity = 'server' + process.pid;
  server.bind('tcp://127.0.0.1:12345', function (err) { 
    if (err) throw err;
    server.on('message', function(data) {
      data = JSON.parse(data);
      switch(data.method) {
        case 'put':
          db = data.body;
          server.send(JSON.stringify(data.body.id));
          break;
        case 'get':
          server.send(JSON.stringify({ body: data.id ? db : [db] }));
          break;
        case 'del':
          server.send(JSON.stringify(true));
          break;
      }
    });
  });

  var adapter = new ZMQAdapter({
    container: container,
    entity: 'TestEntity',
    host: 'tcp://127.0.0.1:12345',
    identity: 'client' + process.id
  });

  before(function (done) {
    adapter.encoder.transcode(values, schema, function (err, result) {
      if (err) throw err;
      values = result;
      done();
    });
  });

  after(function (done) {
    server.close();
    adapter.disconnect(done);
  });

  describe("#connect", function () {
    it("creates a socket connection", function (done) {
      adapter.connect(done);
    });
  });

  describe("#migrate", function () {
    it("by default is a no-op", function (done) {
      adapter.migrate(done);
    });
  });

  describe("#put", function () {
    it("inserts an entity into its table", function (done) {
      adapter.put(values.id, values, done);
    });
  });
  
  describe("#get", function () {
    it("retrieves all entities", function (done) {
      adapter.get(undefined, {}, function (err, entities) {
        if (err) throw err;
        assert.ok(entities.length);
        done();
      });
    });
    it("retreives an entity from its table", function (done) {
      adapter.get(values.id, function (err, entity) {
        if (err) throw err;
        assert.deepEqual(entity._entity, values._entity);
        assert.deepEqual(entity._string, values._string);
        assert.deepEqual(entity._array, values._array);
        assert.deepEqual(entity._object, values._object);
        assert.deepEqual(entity._boolean, values._boolean);
        assert.deepEqual(entity._float, values._float);
        assert.deepEqual(entity._integer, values._integer);
        assert.deepEqual(entity._date, values._date);
        assert.deepEqual(entity._datetime, values._datetime);
        assert.deepEqual(entity._time, values._time);
        done();
      }); 
    });
  });
  
  describe("#del", function () {
    it("deletes an entity", function (done) {
      adapter.del(values.id, done);
    });
  });

});
