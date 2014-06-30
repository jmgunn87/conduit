var assert = require('assert');
var http = require('http');
var RestJsonAdapter = require('./../../src/rest-json-adapter');
var container = require('./index');

describe('RestJsonAdapter', function () {

  var db = {};
  var server = http.createServer(function (req, res) {
    var body = '';
    req.on('data', function (chunk) { body += chunk; });
    req.on('end', function () { 
      if (body) body = JSON.parse(body); 
      res.writeHead(200, { 'Content-Type': 'application/json' });
      switch (req.method) {
        case 'PUT': 
          db = body;
          res.end(body.id);
          break;
        case 'GET':
          res.end(JSON.stringify(
            req.url === '/1' ? db : [db]
          ));
          break;
        case 'DEL': 
          res.end('');
          break;
      }
    });
  })

  var schema = container.get('schemas').TestEntity;
  var values = container.get('seeds').TestEntity[0];
  var adapter = new RestJsonAdapter({
    container: container,
    entity: 'TestEntity',
    path: 'http://localhost:6000'
  });

  before(function (done) {
    adapter.encoder.transcode(values, schema, function (err, result) {
      if (err) throw err;
      values = result;
      server = server.listen(6000);
      adapter.connect(done);
    });
  });

  after(function (done) {
    server.close();
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