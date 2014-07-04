var assert = require('assert');
var Validator = require('./../../src/validator');

describe("Validator", function () {

  before(function () {
    this.instance = new Validator();
    this.instance.schema = {
      fields: {
        username : { type: 'username' },
        password : { type: 'password' },
        email    : { type: 'email' },
        postcode : { type: 'postcode' },
        unknown  : { type: 'unknown' }
      }
    };
    this.instance.put({
      'username' : function (v, o, d) { return d(null); },
      'password' : function (v, o, d) { return d(null); },
      'email'    : function (v, o, d) { return d(null); },
      'postcode' : function (v, o, d) { return d(null); },
      'error'    : function (v, o, d) { return d(new Error('validation error.')); },
      'throw'    : function (v, o, d) { throw new Error('thrown validation error.'); }
    });
  });

  describe("#validate", function () {
    it("returns nothing to its callback if validation is successfull", function (done) {
      this.instance.validate({
        username: 'James1',
        password: 'Passw0rd',
        email: 'jmgunn87@gmail.com',
        postcode: 'se232ez'
      }, done);
    });
    it("returns validation errors to its callback if any are present", function (done) {
      var self = this;
      this.instance.schema.fields.error = { type: 'error' };
      this.instance.validate({
        error: 'error'
      }, function (err) {
        assert.ok(err);
        self.instance.schema.fields.error = undefined;
        done();
      });
    });
    it("catches any thrown errors", function (done) {
      var self = this;
      this.instance.schema.fields.throw = { type: 'throw' };
      this.instance.validate({
        throw: 'throw'
      }, function (err) {
        assert.ok(err);
        self.instance.schema.fields.throw = undefined;
        done();
      });
    });
  });
  
});
