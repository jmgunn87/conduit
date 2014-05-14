var assert = require('assert');
var Container = require('./../../src/container');

describe("Container", function () {

  before(function () {
    this.instance = new Container({});
  });

  describe("#put", function () {
    it("allows factory methods to be defined", function () {
      this.instance.put("factory", function (p) { return p * p; });
      assert.equal(this.instance.get("factory", 10), 100);
      assert.equal(this.instance.get("factory", 20), 400);
    });
    it("allows singleton/service methods to be defined", function () {
      this.instance.put("shared", function (p) { return p * p; }, true);
      this.instance.put("shared2", function (p) { return p * 10; }, true);
      this.instance.get("shared2", 2);
      this.instance.get("shared", 2);
      assert.equal(this.instance.get("shared", 20), 4);
    });
    it("allows the storage of regular JSON parameters", function () {
      this.instance.put("param", 99.66);
      assert.equal(this.instance.get("param"), 99.66);
    });
  });

  describe("#get", function () {
    it("any options are augmented with a reference to the container", function (done) {
      this.instance.put('ref', function (o) {
        assert.ok(o.container);
        done();
      });
      this.instance.get('ref');
    });
  });
});
