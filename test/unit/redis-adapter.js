var assert = require('assert');
var RedisAdapter = require('./../../src/redis-adapter');
var container = require('./index');

describe('RedisAdapter', function () {

  var schema = container.get('schemas').TestEntity;
  var values = container.get('seeds').TestEntity[0];
  var adapter = new RedisAdapter({
    container: container,
    entity: 'TestEntity'
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

  describe("#migrate", function () {
    it("creates a db table for a given schema", function (done) {
      adapter.migrate(done);
    });
  });

  describe("#put", function () {
    it("inserts an entity into its table", function (done) {
      adapter.put(values.id, values, done);
    });
  });
  
  describe("#get", function () {
    xit("retrieves all entities", function (done) {
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
      adapter.del(values.id, function (err) {
        if (err) throw err;
        adapter.get(values.id, function(err, value) {
          if (err) throw err;
          assert.ok(!value);
          done();
        });
      });
    });
    it("destroys any indexes", function (done) {
      adapter.client.keys('TestEntity*', function (err, result) {
        if (err) throw err;
        assert.ok(!result.length); 
        done();
      });
    });
  });

});