var assert = require('assert');
var Model = require('./../../src/model');

describe("Model", function () {
  
  var model;
  var mapper = new Model({
    model: { id: 'yes' }
  });
  var parent = new Model({
    parentKey: 222
  });
  
  before(function () {
    model = new Model({
      mapper: mapper,
      parent: parent,
      fk: 'someid',
      schema: {
        entity: 'model',
        fields: {
          parent: {
            entity: 'model',
            inversed: 'child' 
          }, 
          child: {
            entity: 'model',
            mapped: 'parent' 
          },
          fk: {
            entity: 'model'
          }
        }
      }
    });
  });

  describe("#constructor", function () {
    it("constructs without args", function () {
      new Model();
    });
  });

  describe("#_dispatch", function () {
    it("catches an re throws any exceptions to it's callback", function (done) {
      model._dispatch('unknown', ['key', function (err) {
        assert.ok(err);
        done();
      }]);
    });
  });

  describe("#put", function () {
    it("it accepts undefined as a key", function (done) {
      model.put(undefined);
      model.put(undefined, undefined, done);
    });
    it("returns an error if the key type is invalid", function (done) {
      model.put(function() {}, 1, done);
    });
    it("stores a value under a key (string, *)", function () {
      model.put("key1s", 1);
    });
    it("stores a value under a key (string, *, function)", function (done) {
      model.put("key1a", 2, function (err) {
        if (err) throw err;
        done();
      });
    });
    it("stores a value under a key (string, *, object)", function () {
      model.put("key2s", 3, {});
    });
    it("stores a value under a key (string, *, object, function)", function (done) {
      model.put("key2a", 4, {}, function (err) {
        if (err) throw err;
        done();
      });
    });
    it("stores a value under a key (object)", function () {
      model.put({ "key3s": 5 });
    });
    it("stores a value under a key (object, function)", function (done) {
      model.put({ "key3a": 6 }, function (err) {
        if (err) throw err;
        done();
      });
    });
    it("stores a value under a key (object, object)", function () {
      model.put({ "key4s": 7 }, {});
    });
    it("stores a value under a key (object, object, function)", function (done) {
      model.put({ "key4a": 8 }, {}, function (err) {
        if (err) throw err;
        done();
      });
    });
    it("sets the values parent link if it is a model", function (done) {
      var child = new Model();
      model.put('child', child, function (err) {
        if (err) throw err;
        assert.ok(child.store.parent);
        done();
      });
    });
    it("sets each model inside an arrays parent link to this", function (done) {
      var child1 = new Model();
      var child2 = new Model();
      model.put('child', [child1, child2], function (err) {
        if (err) throw err;
        assert.ok(child1.store.parent);
        assert.ok(child2.store.parent);
        done();
      });
    });
    it("emits a 'put' event", function (done) {
      model.once("put", function (key, value) {
        assert.equal(key, "key4a");
        assert.equal(value, 8);
        done();
      });
      model.put("key4a", 8);
    });
  });
  describe("#get", function () {
    it("it accepts undefined as a key", function (done) {
      model.get(undefined);
      model.get(undefined, done);
    });
    it("accepts any javascript type as a key", function (done) {
      model.get([{}, {}, 1, [], 10.0, function () {}], done);
    });
    it("retrieves a value under a key (string, *)", function () {
      model.get("key1s");
    });
    it("falls back to retrieve the value from parent if set", function () {
      assert.equal(model.get("parentKey"), 222);
    });
    it("retrieves a value under a key (string, *, function)", function (done) {
      model.get("key1a", function (err, v) {
        if (err) throw err;
        assert.equal(v, 2);
        done();
      });
    });
    it("retrieves a value under a key (string, *, object)", function () {
      model.get("key2s", {});
    });
    it("retrieves a value under a key (string, *, object, function)", function (done) {
      model.get("key2a", {}, function (err, v) {
        if (err) throw err;
        assert.equal(v, 4);
        done();
      });
    });
    it("retrieves a value under a key (object)", function () {
      model.get({ "key3s": {},  "key4s": {} });
    });
    it("retrieves a value under a key (object, function)", function (done) {
      model.get({ "key3a": {},  "key4a": {} }, function (err, v) {
        if (err) throw err;
        assert.equal(v.key3a, 6);
        assert.equal(v.key4a, 8);
        done();
      });
    });
    it("retrieves a value under a key (array)", function () {
      model.get(["key3s", "key4s"]);
    });
    it("retrieves a value under a key (array, function)", function (done) {
      model.get(["key3a", "key4a"], function (err, v) {
        if (err) throw err;
        assert.equal(v.key3a, 6);
        assert.equal(v.key4a, 8);
        done();
      });
    });
    it("emits a 'get' event", function (done) {
      model.once("get", function (key) {
        assert.equal(key, "key4a");
        done();
      });
      model.get("key4a");
    });
    it("uses its mapper to lazy-load any FK references", function (done) {
      assert.equal(model.store.fk, 'someid');
      model.get('fk', function (err, instance) {
        if (err) throw err;
        assert.equal(instance.id, 'yes');
        done();
      }); 
    });
  });
  describe("#del", function () {
    it("it accepts undefined as a key", function (done) {
      model.del(undefined);
      model.del(undefined, done);
    });
    it("accepts any javascript type as a key", function (done) {
      model.del([{}, {}, 1, [], 10.0, function () {}], done);
    });
    it("returns an error if the key type is invalid", function (done) {
      model.del(function() {}, done);
    });
    it("removes a value under a key (string, *)", function () {
      model.del("key1s");
      assert.ok(!model.store.key1s);
    });
    it("removes a value under a key (string, *, function)", function (done) {
      model.del("key1a", function (err, v) {
        if (err) throw err;
        assert.ok(!model.store.key1a);
        done();
      });
    });
    it("removes a value under a key (string, *, object)", function () {
      model.del("key2s", {});
      assert.ok(!model.store.key2s);
    });
    it("removes a value under a key (string, *, object, function)", function (done) {
      model.del("key2a", {}, function (err, v) {
        if (err) throw err;
        assert.ok(!model.store.key2a);
        done();
      });
    });
    it("removes a value under a key (object)", function () {
      model.del({ "key3s": {},  "key4s": {} });
      assert.ok(!model.store.key3s);
      assert.ok(!model.store.key4s);
    });
    it("removes a value under a key (object, function)", function (done) {
      model.del({ "key3a": {},  "key4a": {} }, function (err, v) {
        if (err) throw err;
        assert.ok(!model.store.key3a);
        assert.ok(!model.store.key4a);
        done();
      });
    });
    it("removes a value under a key (array)", function () {
      model.del(["key3s", "key4s"]);
    });
    it("removes a value under a key (array, function)", function (done) {
      model.del(["key3a", "key4a"], function (err, v) {
        if (err) throw err;
        done();
      });
    });
    it("emits a 'del' event", function (done) {
      model.once("del", function (key) {
        assert.equal(key, "key4a");
        done();
      });
      model.del("key4a");
    });
  });
  describe("#preUpdate", function () {
    it("by default is an async noop", function (done) {
      model.preUpdate(done);
    });
  });
  describe("#postUpdate", function () {
    it("by default is an async noop", function (done) {
      model.postUpdate(done);
    });
  });

});