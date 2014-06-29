var Conduit = require('./src/conduit');

Conduit.Model = require('./src/model');
Conduit.Container = require('./src/container');
Conduit.Validator = require('./src/validator');
Conduit.Transcoder = require('./src/transcoder');
Conduit.Mapper = require('./src/mapper');
Conduit.Adapter = require('./src/adapter');
Conduit.IndexedDBAdapter = require('./src/indexeddb-adapter');

module.exports = Conduit;