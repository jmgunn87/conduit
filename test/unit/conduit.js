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
});
