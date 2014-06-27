var assert = require('assert');
var MongoDBAdapter = require('./../../src/mongodb-adapter');
var Container = require('./../../src/container');
var Transcoder = require('./../../src/transcoder');
var Validator = require('./../../src/validator');

describe('MongoDBAdapter', function () {

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

  var adapter = new MongoDBAdapter({
    container: container,
    entity: 'TestEntity',
    host: 'localhost',
    port: 27017,
    dbname: 'conduit_tests'
  });

  before(function (done) {
    adapter.connect(done);
  });

  after(function (done) {
    adapter.disconnect(done);
  });

  describe("#connect", function () {
    it("is by default a no-op", function (done) {
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
    it("inserts another entity into its table", function (done) {
      values.id = 3;
      adapter.put(2, values, done);
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