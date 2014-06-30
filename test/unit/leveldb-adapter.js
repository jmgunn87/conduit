var assert = require('assert');
var rimraf = require('rimraf');
var LevelDBAdapter = require('./../../src/leveldb-adapter');
var container = require('./index');

describe('LevelDBAdapter', function () {

  var schemas = {};
  schemas.TestEntity = {
    entity: 'TestEntity',
    id: 'id',
    fields: { 
      id       : { type: 'integer' },
      entity   : { type: 'entity',   entity: 'OtherTest' },
      object   : { type: 'object',   index: true, length: 255 },
      array    : { type: 'array',    index: true, length: 255 },
      string   : { type: 'string',   index: true, length: 255 },
      boolean  : { type: 'boolean',  index: true, length: 1   },
      float    : { type: 'float',    index: true, length: 255 },
      integer  : { type: 'integer',  index: true, length: 255 },
      date     : { type: 'date',     index: true, length: 255 },
      datetime : { type: 'datetime', index: true, length: 255 },
      time     : { type: 'time',     index: true, length: 255 }
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

  container.put('TestEntity/schema', schemas.TestEntity);
  var adapter = new LevelDBAdapter({
    container: container,
    entity: 'TestEntity',
    path: '/tmp/ldbtest.db'
  });

  before(function (done) {
    adapter.connect(done);
  });

  after(function (done) {
    adapter.disconnect(function () {
      rimraf('/tmp/ldbtest.db', done);
    });
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
    it("updates indexes properly", function (done) {
      values.integer = 102;
      adapter.put(values.id, values, function (err) {
        if (err) throw err;
        adapter.client.get('TestEntity/integer/101', function (err, value) {
          assert.ok(!value);
          done();
        });
      });
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
        assert.deepEqual(new Date(entity.date), values.date);
        assert.deepEqual(new Date(entity.datetime), values.datetime);
        assert.deepEqual(new Date(entity.time), values.time);
        done();
      }); 
    });
    it("allows basic querying", function (done) {
      adapter.get(null, {
        offset: 'TestEntity',
        limit: 2
      }, function (err, records) {
        if (err) throw err;
        assert.equal(records.length, 2);
        for (var i=0; i < records.length; ++i) {
          var entity = records[i];
          assert.deepEqual(entity.string, values.string);
          assert.deepEqual(entity.array, values.array);
          assert.deepEqual(entity.object, values.object);
          assert.deepEqual(entity.boolean, values.boolean);
          assert.deepEqual(entity.float, values.float);
          assert.deepEqual(entity.number, values.number);
          assert.deepEqual(new Date(entity.date), values.date);
          assert.deepEqual(new Date(entity.datetime), values.datetime);
          assert.deepEqual(new Date(entity.time), values.time);
        }
        done();
      });
    });
  });
  
  describe("#del", function () {
    it("deletes an entity", function (done) {
      adapter.del(values.id, done);
    });
    it("destroys any indexes", function (done) {
      var found = undefined;
      adapter.client.createReadStream()
        .on('data', function (data) {
          console.log(data)
          found = new Error('indexes found');
        })
        .on('error', function (err) {
          throw err;
        })
        .on('end', function () {
          done(found);
        });
    });
  });

});