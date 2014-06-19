var assert = require('assert');
var Adapter = require('./../../src/adapter');
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
      instance.registerAdapter('User', Adapter);
      assert.deepEqual(instance.get('User/adapter').container, instance);
    });
  });

  describe("#assemble", function () {
    it("performs any inheritance specified in a schema", function (done) {
      instance.registerSchema('Child', {
        entity: 'Child',
        inherits: 'Parent',
        fields: {
          child: { type: 'text' }
        }
      });
      instance.registerSchema('Parent', {
        entity: 'Parent',
        inherits: 'Grandparent',
        fields: {
          parent: { type: 'text' }
        }
      });
      instance.registerSchema('Grandparent', {
        entity: 'Grandparent',
        fields: {
          grandparent: { type: 'text' }
        }
      });
      instance.assemble(function (err) {
        if (err) throw err;
        var child = instance.get('Child/schema');
        assert.ok(child.fields.grandparent);
        assert.ok(child.fields.child);
        assert.ok(child.fields.parent);
        var parent = instance.get('Parent/schema');
        assert.ok(parent.fields.grandparent);
        assert.ok(parent.fields.parent);
        assert.ok(!parent.fields.child);
        var grandparent = instance.get('Grandparent/schema');
        assert.ok(grandparent.fields.grandparent);
        assert.ok(!grandparent.fields.parent);
        assert.ok(!grandparent.fields.child);
        done();
      });
    });
  });
});
