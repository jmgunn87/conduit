var assert = require('assert');
var _ = require('lodash');
var MySQLAdapter = require('./../../src/mysql-adapter');
var container = require('./index');

describe('MySQLAdapter', function () {

  var insertID = null;
  var schema = container.get('schemas').TestEntity;
  var values = container.get('seeds').TestEntity[0];
  var adapter = new MySQLAdapter({
    container: container,
    entity: 'TestEntity',
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'conduit_test'
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

  describe("#constructor", function () {
    it("accepts templates and container configs", function () {
      assert.ok(adapter.templates);
      assert.ok(adapter.container);
    });
    it("retreives schema data", function () {
      assert.equal(adapter.schema.entity, 'TestEntity');
    });
  });

  describe("#connect", function () {
    it("pools/caches connections if the already exist for the given path", function (done) {
      adapter.connect(done);
    });
  });
  
  describe('#put', function () {
    it('inserts an entity into its table', function (done) {
      adapter.put(values.id, values, function (err, id) {
        if (err) throw err;
        assert.ok(id);
        insertID = id;
        done();
      });
    });
    it("allows the user to pass a custom sql template", function (done) {
      adapter.put(insertID, values, {
        template: 'ERROR',
      }, function (err, entity) {
        assert.ok(err);
        done();
      });
    });
    it("short circuits if any encoding fails", function (done) {
      adapter.encoders.bad = function (v, o, d) {
        return d(new Error('encoding error'));
      };
      adapter.put('1', {}, function (err, entity) {
        assert.ok(err);
        delete adapter.encoders.bad;
        done();
      }); 
    });
  });
  
  describe('#get', function () {
    it('retreives an entity from its table', function (done) {
      adapter.get(insertID, function (err, entity) {
        if (err) throw err;
        assert.deepEqual(entity._entity, values._entity);
        assert.deepEqual(entity._string, values._string);
        assert.deepEqual(entity._array, values._array);
        assert.deepEqual(entity._object, values._object);
        assert.deepEqual(entity._boolean, values._boolean);
        assert.deepEqual(entity._float, values._float);
        assert.deepEqual(entity._integer, values._integer);
        done();
      }); 
    });
    it("allows the user to pass a custom sql template", function (done) {
      adapter.get(insertID, {
        template: 'ERROR',
      }, function (err, entity) {
        assert.ok(err);
        done();
      });
    });
    it("returns any errors from the underlying adapter", function (done) {
      var template = adapter.templates.get;
      adapter.templates.get = _.template(['SELECT SOMETHING WRONG FROM NOWHERE']);
      adapter.get(insertID, function (err, entity) {
        assert.ok(err);
        adapter.templates.get = template;
        done();
      }); 
    });
  });
  
  describe('#del', function () {
    it('deletes an entity', function (done) {
      adapter.del(insertID, done);
    });
    it("allows the user to pass a custom sql template", function (done) {
      adapter.del(insertID, {
        template: 'ERROR',
      }, function (err, entity) {
        assert.ok(err);
        done();
      });
    });
  });
  
});
