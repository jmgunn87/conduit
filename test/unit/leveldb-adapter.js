var assert = require('assert');
var Container = require('./../../src/container');
var LevelDBAdapter = require('./../../src/leveldb-adapter');

describe('LevelDBAdapter', function () {

  var fields = {
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

  var adapter = new LevelDBAdapter({
    container: new Container(),
    path: '/tmp/ldbtest.db'
  });

  before(function (done) {
    adapter.connect(done);
  });

  after(function (done) {
    adapter.disconnect(done);
  });

  describe("#connect", function () {
    it("pools/caches connections if the already exist for the given path", function (done) {
      adapter.connect(done);
    });
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
        assert.deepEqual(+new Date(entity.date), +values.date);
        assert.deepEqual(+new Date(entity.datetime), +values.datetime);
        assert.deepEqual(+new Date(entity.time), +values.time);
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