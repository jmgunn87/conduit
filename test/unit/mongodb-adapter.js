var assert = require('assert');
var MongoDBAdapter = require('./../../src/mongodb-adapter');
var container = require('./index');

describe('MongoDBAdapter', function () {

  var schema = container.get('schemas').TestEntity;
  var values = container.get('seeds').TestEntity[0];
  var adapter = new MongoDBAdapter({
    container: container,
    entity: 'TestEntity',
    host: 'localhost',
    port: 27017,
    dbname: 'conduit_tests'
  });

  before(function (done) {
    adapter.encoder.transcode(values, schema, function (err, result) {
      if (err) throw err;
      values = result;
      adapter.connect(done);
    });
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