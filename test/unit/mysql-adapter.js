var assert = require('assert');
var _ = require('lodash');
var Model = require('./../../src/model');
var Container = require('./../../src/container');
var Transcoder = require('./../../src/transcoder');
var Validator = require('./../../src/validator');
var MySQLAdapter = require('./../../src/mysql-adapter');

describe('MySQLAdapter', function () {

  var schemas = {};
  schemas.TestEntity = {
    entity: 'TestEntity',
    id: 'id',
    fields: { 
      id        : { type: 'integer' },
      _entity   : { type: 'entity',   entity: 'OtherTest' },
      _object   : { type: 'object',   length: 255 },
      _array    : { type: 'array',    length: 255 },
      _string   : { type: 'string',   length: 255 },
      _boolean  : { type: 'boolean',  length: 1   },
      _float    : { type: 'float',    length: 255 },
      _integer  : { type: 'integer',  length: 255 },
      _date     : { type: 'date',     length: 255 },
      _datetime : { type: 'datetime', length: 255 },
      _time     : { type: 'time',     length: 255 },
      _bad      : { type: 'bad',      length: 255 }
    }
  };
  
  var values = {
    _entity   : '98989898',
    _object   : { a: 1, b: 2, c: 3 },
    _array    : [1, 2, 3],
    _string   : 'string',
    _boolean  : false,
    _float    : 100.001,
    _integer  : 101,
    _date     : new Date(),
    _datetime : new Date(),
    _time     : new Date(),
    _bad      : true
  };

  var container = new Container();
  container.put('validator', function (params) { return new Validator(params); });
  container.put('encoder', function (params) { return new Transcoder(params); });
  container.put('decoder', function (params) { return new Transcoder(params); });
  container.put('TestEntity/schema', schemas.TestEntity);

  var insertID = null;
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
    adapter.connect(done);
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
  
  describe("#migrate", function () {
    it("does not generate any migrations for an unchanged entity", function (done) {
      adapter.migrate(function (err, migration) {
        if (err) throw err;
        done();
      });
    });
    it("generates a migration if an entity has changes", function (done) {
      adapter.schema.fields._time.type = 'string';
      adapter.schema.fields._date.length = 1;
      adapter.migrate(function (err) {
        if (err) throw err;
        adapter.schema.fields._time.type = 'time';
        adapter.schema.fields._date.length = 255;
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
        entity = entity[0]
        assert.deepEqual(entity._entity, values._entity);
        assert.deepEqual(entity._string, values._string);
        assert.deepEqual(entity._array, values._array);
        assert.deepEqual(entity._object, values._object);
        assert.deepEqual(entity._boolean, values._boolean);
        assert.deepEqual(entity._float, values._float);
        assert.deepEqual(entity._integer, values._integer);
        assert.deepEqual(entity._date.getFullYear(), values._date.getFullYear());
        assert.deepEqual(entity._date.getMonth(), values._date.getMonth());
        assert.deepEqual(entity._date.getDate(), values._date.getDate());
        assert.deepEqual(entity._datetime.getFullYear(), values._datetime.getFullYear());
        assert.deepEqual(entity._datetime.getMonth(), values._datetime.getMonth());
        assert.deepEqual(entity._datetime.getDate(), values._datetime.getDate());
        assert.deepEqual(entity._datetime.getHours(), values._datetime.getHours());
        assert.deepEqual(entity._datetime.getMinutes(), values._datetime.getMinutes());
        assert.deepEqual(entity._datetime.getSeconds(), values._datetime.getSeconds());
        assert.deepEqual(entity._time.getFullYear(), values._time.getFullYear());
        assert.deepEqual(entity._time.getMonth(), values._time.getMonth());
        assert.deepEqual(entity._time.getDate(), values._time.getDate());
        assert.deepEqual(entity._time.getHours(), values._time.getHours());
        assert.deepEqual(entity._time.getMinutes(), values._time.getMinutes());
        assert.deepEqual(entity._time.getSeconds(), values._time.getSeconds());
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
  
  xdescribe('#exec', function () {
    it('executes arbritrary sql statements', function (done) {
      adapter.exec('SELECT COUNT(*) FROM TestEntity', [], done);
    });
  });

});
