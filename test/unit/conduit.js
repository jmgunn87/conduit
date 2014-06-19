var assert = require('assert');
var Conduit = require('./../../src/conduit');

describe('Conduit', function () {

  var instance = new Conduit();
  
  describe("#schema", function () {
    it("registers a schema with the container", function () {
      instance.registerSchema('User', {});
      assert.deepEqual(instance.get('User/schema'), {});
    });
  });
  
  describe("#model", function () {
    it("registers a model with the container", function () {
      instance.registerModel('User', Object);
      assert.deepEqual(instance.get('User/model').container, instance);
    });
  });
  
  describe("#adapter", function () {
    it("registers a adapter with the container", function () {
      instance.registerAdapter('User', Object);
      assert.deepEqual(instance.get('User/adapter').container, instance);
    });
  });

  describe("#assemble", function () {
    it("performs any inheritance specified in a schema", function (done) {
      instance.registerSchema('Parent', {
        entity: 'Parent',
        fields: {
          parent: { type: 'text' }
        }
      });
      instance.registerSchema('Child', {
        entity: 'Child',
        inherits: 'Parent',
        fields: {
          child: { type: 'text' }
        }
      });
      instance.assemble(function (err) {
        if (err) throw err;
        var child = instance.get('Child/schema');
        assert.ok(child.fields.child);
        assert.ok(child.fields.parent);
        var parent = instance.get('Parent/schema');
        assert.ok(parent.fields.parent);
        assert.ok(!parent.fields.child);
        done();
      });
    });
  });
});
