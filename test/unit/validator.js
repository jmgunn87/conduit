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
      'error'    : function (v, o, d) { return d(new Error('This is an error.')); },
      'throw'    : function (v, o, d) { throw new Error('This is an error.'); }
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
    it("catches any thrown errors", function (done) {
      this.instance.validate({
        'throw': 'value'
      }, {
        fields: {
          throw: { type: 'throw' }
        }
      }, function (err, transcoded) {
        assert.ok(err);
        done();
      });
    });
    it("handles null values", function (done) {
      this.instance.validate(null, {
        fields: {
          postcode : { type: 'error' }
        }
      }, function (err, results) {
        if (err) throw err;
        assert.ok(!results);
        done();
      });
    });
    it("handles null schemas", function (done) {
      this.instance.validate({}, null, function (err, results) {
        if (err) throw err;
        assert.ok(!results);
        done();
      });
    });
    it("handles invalid schemas", function (done) {
      this.instance.validate({}, {}, function (err, results) {
        if (err) throw err;
        assert.ok(!results);
        done();
      });
    });
  });
  
});
