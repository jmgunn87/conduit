var assert = require('assert');
var Transcoder = require('./../../src/transcoder');

describe("Transcoder", function () {

  before(function () {
    this.instance = new Transcoder({
      "datetime": function (v, o, d) { return d(null, +v); },
      "secret": function (v, o, d) { return d(null, 'message'); },
      "error": function (v, o, d) { return d(true); }
    });
  });

  describe("#transcode", function () {
    it("transcodes an entities fields using its schema for direction", function (done) {
      this.instance.transcode({
        secret: '097329ruiwghd3ew',
        datetime: new Date(),
        unknown: 1987
      }, {
        fields: {
          secret: { type: 'secret' },
          datetime: { type: 'datetime' },
          unknown: { type: 'unknown' }
        }
      }, function (err, transcoded) {
        if (err) throw err;
        assert.equal(transcoded.secret, 'message'); 
        assert.equal(typeof transcoded.datetime, 'number'); 
        assert.equal(transcoded.unknown, 1987); 
        done();
      });
    });
    it("passes back any errors that occur from encoding", function (done) {
      this.instance.transcode({
        'error': 'value'
      }, {
        fields: {
          error: { type: 'error' }
        }
      }, function (err, transcoded) {
        assert.ok(err); 
        done();
      });
    });
  });

});
