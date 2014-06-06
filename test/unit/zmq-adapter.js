var assert = require('assert');
var zmq = require('zmq');
var ZMQAdapter = require('./../../src/zmq-adapter');
var Container = require('./../../src/container');
var Transcoder = require('./../../src/transcoder');
var Validator = require('./../../src/validator');

describe('ZMQAdapter', function () {

  var schemas = {};
  schemas.TestEntity = {
    entity: 'TestEntity',
    id: 'id',
    fields: { 
      id       : { type: 'integer' },
      entity   : { type: 'entity',   entity: 'OtherTest' },
      object   : { type: 'object',   length: 255 },
      array    : { type: 'array',    length: 255 },
      string   : { type: 'string',   length: 255 },
      boolean  : { type: 'boolean',  length: 1   },
      float    : { type: 'float',    length: 255 },
      integer  : { type: 'integer',  length: 255 },
      date     : { type: 'date',     length: 255 },
      datetime : { type: 'datetime', length: 255 },
      time     : { type: 'time',     length: 255 }
    }
  };
  
  var values = {
    id       : '1',
    entity   : '98989898',
    object   : { a: 1, b: 2, c: 3 },
    array    : [1, 2, 3],
    string   : 'string',
    boolean  : false,
    float    : 100.001,
    integer  : 101,
    date     : new Date(),
    datetime : new Date(),
    time     : new Date()
  };

  var container = new Container();
  container.put('validator', function (params) { return new Validator(params); });
  container.put('encoder', function (params) { return new Transcoder(params); });
  container.put('decoder', function (params) { return new Transcoder(params); });
  container.put('TestEntity/schema', schemas.TestEntity);

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
          server.send(JSON.stringify({ body: data.id 
            ? db
            : [db]
          }));
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
        assert.deepEqual(entity.string, values.string);
        assert.deepEqual(entity.array, values.array);
        assert.deepEqual(entity.object, values.object);
        assert.deepEqual(entity.boolean, values.boolean);
        assert.deepEqual(entity.float, values.float);
        assert.deepEqual(entity.number, values.number);
        assert.deepEqual(entity.date, values.date);
        assert.deepEqual(entity.datetime, values.datetime);
        assert.deepEqual(entity.time, values.time);
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
