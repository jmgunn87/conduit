var assert = require('assert');
var Validator = require('./../../src/validator');

describe("Validator", function () {

  before(function () {
    this.instance = new Validator();
    this.instance.put({
      'username' : function (v, o, d) { return d(null); },
      'password' : function (v, o, d) { return d(null); },
      'email'    : function (v, o, d) { return d(null); },
      'postcode' : function (v, o, d) { return d(null); },
      'error'    : function (v, o, d) { return d(new Error('This is an error.')); }
    });
  });

  describe("#validate", function () {
    it("returns nothing to its callback if validation is successfull", function (done) {
      this.instance.validate({
        username: 'James1',
        password: 'Passw0rd',
        email: 'jmgunn87@gmail.com',
        postcode: 'se232ez'
      }, {
        fields: {
          username : { type: 'username' },
          password : { type: 'password' },
          email    : { type: 'email' },
          postcode : { type: 'postcode' },
          unknown  : { type: 'unknown' },
        }
      }, done);
    });
    it("returns validation errors to its callback if any are present", function (done) {
      this.instance.validate({
        username: 'James1',
        password: 'Passw0rd',
        email: 'jmgunn87@gmail.com',
        postcode: 'se232ez'
      }, {
        fields: {
          username : { type: 'username' },
          password : { type: 'error' },
          email    : { type: 'email' },
          postcode : { type: 'error' }
        }
      }, function (err, results) {
        assert.ok(err);
        assert.ok(results.password);
        assert.ok(results.postcode);
        done();
      });
    });
  });
  
});
