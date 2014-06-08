var async = require('async');
var http = require('http');
var Model = require('./../src/model');
var Mapper = require('./../src/mapper');
var Container = require('./../src/container');
var LevelDBAdapter = require('./../src/leveldb-adapter');
var Transcoder = require('./../src/transcoder');
var Validator = require('./../src/validator');
var container = new Container();
var mapper = new Mapper({ container: container });

container.put('validator', function (params) { return new Validator(params); });
container.put('encoder', function (params) { return new Transcoder(params); });
container.put('decoder', function (params) { return new Transcoder(params); });
container.put('gene/schema', {
  entity: 'gene',
  id: 'id',
  fields: {
    id: { type: 'integer' },
    tag: { type: 'text' },
    one2one: {
      type: 'entity',
      entity: 'gene'
    },
    many2one: {
      type: 'entity',
      entity: 'gene'
    },
    one2oneMapped: {
      type: 'entity',
      entity: 'child',
      mapped: 'one2oneInversed'
    },
    one2manyMapped: {
      type: 'entity',
      entity: 'child',
      mapped: 'one2manyInversed'
    }
  }
});

container.put('child/schema', {
  entity: 'child',
  id: 'id',
  fields: {
    id: { type: 'integer' },
    tag: { type: 'text' },
    one2oneInversed: {
      type: 'entity',
      entity: 'gene',
      inversed: 'one2oneMapped'
    },
    one2manyInversed: {
      type: 'entity',
      entity: 'gene',
      inversed: 'one2manyMapped'
    }
  }
});

container.put('gene/model', function (values) {
  values.schema = container.get('gene-schema');
  values.mapper = mapper; 
  return new Model(values); 
});

container.put('child/model', function (values) {
  values.schema = container.get('child-schema');
  values.mapper = mapper; 
  return new Model(values); 
});

container.put('gene/adapter', function () {
  return new LevelDBAdapter({ 
    entity: 'gene',
    container: container,
    path: '/tmp/bench.ldb'
  });
}, true);

container.put('child/adapter', function () {
  return new LevelDBAdapter({ 
    entity: 'child',
    container: container, 
    path: '/tmp/bench.ldb'
  });
}, true);

async.parallel([
  function (done) { 
    container.get('gene/adapter').connect(function () {
      container.get('gene/adapter').migrate(done);
    });
  },
  function (done) { 
    container.get('child/adapter').connect(function () {
      container.get('child/adapter').migrate(done);
    });
  },
], function (err) {
  
  http.createServer(function (req, res) {
    var body = '';
    req.on('data', function (chunk) { body += chunk; });
    req.on('end', function () {

      var entity = /gene/.test(req.url)
        ? 'gene'
        : 'child'
        ;

      if (body) body = JSON.parse(body); 
      res.writeHead(200, { 'Content-Type': 'application/json' });
      switch (req.method) {
        case 'PUT': 
          var gene = container.get('gene/model', {});
          gene.put(body);
          mapper.put(entity, gene, function (err, id) { 
            console.log(id);
            res.end(id);
          });
          break;
        case 'GET':
          break;
        case 'DEL': 
          break;
      }
    });
  }).listen(7007);

});
