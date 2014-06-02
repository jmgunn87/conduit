var Model = require('./src/model');
var Container = require('./src/container');
var Validator = require('./src/validator');
var Transcoder = require('./src/transcoder');
var Mapper = require('./src/mapper');
var Adapter = require('./src/adapter');
var LevelDBAdapter = require('./src/leveldb-adapter');
var SQLite3Adapter = require('./src/sqlite3-adapter');
var RestJsonAdapter = require('./src/rest-json-adapter');

module.exports = Conduit;

function Conduit(config) {
  Container.call(this, config);
  this.put('validator', function (params) { return new Validator(params); });
  this.put('encoder', function (params) { return new Transcoder(params); });
  this.put('decoder', function (params) { return new Transcoder(params); });
  this.put('mapper', function (params) { 
    return new Mapper(params); 
  }, true);
}

Conduit.prototype = Object.create(Container.prototype);

Conduit.Model = Model;
Conduit.Container = Container;
Conduit.Validator = Validator;
Conduit.Transcoder = Transcoder;
Conduit.Mapper = Mapper;
Conduit.Adapter = Adapter;
Conduit.LevelDBAdapter = LevelDBAdapter;
Conduit.SQLite3Adapter = SQLite3Adapter;
Conduit.RestJsonAdapter = RestJsonAdapter;
