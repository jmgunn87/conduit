var LevelDBAdapter = require('./leveldb-adapter');
var leveljs = require('level-js');

modules.exports = IndexedDBAdapter;

function IndexedDBAdapter (config) {
  config.db = leveljs;
  LevelDBAdapter.call(this, config);
}

IndexedDBAdapter.prototype = Object.create(LevelDBAdapter.prototype);