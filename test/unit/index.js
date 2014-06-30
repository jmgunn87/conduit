var schemas = require('./../fixtures/schemas');
var seeds = require('./../fixtures/seeds');
var Model = require('./../../src/model');
var Conduit = require('./../../src/conduit');

var container = module.exports = new Conduit();

container.registerSchema('TestEntity', schemas.TestEntity);
container.registerModel('TestEntity', Model);
container.put('schemas', schemas);
container.put('seeds', seeds);
