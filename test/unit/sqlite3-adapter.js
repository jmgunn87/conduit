var assert = require('assert');
var rimraf = require('rimraf');
var _ = require('lodash');
var SQLite3Adapter = require('./../../src/sqlite3-adapter');
var container = require('./index');

describe('SQLite3Adapter', function () {

  var insertID = null;
  var schema = container.get('schemas').TestEntity;
  var values = container.get('seeds').TestEntity[0];
  var adapter = new SQLite3Adapter({
    entity: 'TestEntity',
    path: '/tmp/sqlite3test.db',
    container: container
  });

  before(function (done) {
    adapter.encoder.transcode(values, schema, function (err, result) {
      if (err) throw err;
      values = result;
      adapter.connect(done);
    });
  });

  after(function (done) {
    adapter.disconnect(function () {
      rimraf('/tmp/sqlite3test.db', done);
    });
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
  
  describe("#migrate", function () {
    it("does not generate any migrations for an unchanged entity", function (done) {
      adapter.migrate(function (err, migration) {
        if (err) throw err;
        done();
      });
    });
    it("generates a migration if an entity has changes", function (done) {
      adapter.schema.fields.time.type = 'string';
      adapter.schema.fields.date.length = 1;
      adapter.migrate(function (err) {
        if (err) throw err;
        adapter.schema.fields.time.type = 'time';
        adapter.schema.fields.date.length = 255;
        done();
      });
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
        assert.deepEqual(entity.entity, values.entity);
        assert.deepEqual(entity.string, values.string);
        assert.deepEqual(entity.array, values.array);
        assert.deepEqual(entity.object, values.object);
        assert.deepEqual(entity.boolean, values.boolean);
        assert.deepEqual(entity.float, values.float);
        assert.deepEqual(entity.integer, values.integer);
        assert.deepEqual(entity.date, values.date);
        assert.deepEqual(entity.datetime, values.datetime);
        assert.deepEqual(entity.time, values.time);
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
  
  describe('#exec', function () {
    it('executes arbritrary sql statements', function (done) {
      adapter.exec('SELECT COUNT(*) FROM TestEntity', [], done);
    });
  });

});