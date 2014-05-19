var async = require('async');
var Model = require('./src/model');
var Mapper = require('./src/mapper');
var Container = require('./src/container');
var WebSQLAdapter = require('./src/websql-adapter');
var Transcoder = require('./src/transcoder');
var Validator = require('./src/validator');

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
  return new WebSQLAdapter({ 
    entity: 'gene',
    container: container, 
    name: 'gene'
  });
}, true);

container.put('child/adapter', function () {
  return new WebSQLAdapter({ 
    entity: 'child',
    container: container, 
    name: 'child',
  });
}, true);

async.parallel([
  function (done) { 
    container.get('gene/adapter').connect(function () {
      container.get('gene/adapter').createTable(done);
    });
  },
  function (done) { 
    container.get('child/adapter').connect(function () {
      container.get('child/adapter').createTable(done);
    });
  },
], function (err) {

  console.log(err);

  var gene = container.get('gene/model', {});
  gene.put({
    tag: 'root',
    one2one: container.get('gene/model', { tag: '121' }),
    many2one: container.get('gene/model', { tag: '*21' }),
    one2oneMapped: container.get('child/model', { tag: '121m' }),
    one2manyMapped: [
      container.get('child-model', { tag: '12*m-1' }),
      container.get('child-model', { tag: '12*m-2' }),
      container.get('child-model', { tag: '12*m-3' }),
      container.get('child-model', { tag: '12*m-4' })
    ]
  });

/*
  mapper.put('gene', gene, function (e, id) {
    if (e) {
      console.log(e.stack);
      return;
    }

    mapper.get('gene', {
      query: {
        tag: 'root'
      },
      fields: ['id'],
      offset: 10,
      limit: 10
    }, function (e, r) {
      console.log(e ? e.stack : e, r?r.length:r);
    });
  });
  */
  mapper.put('gene', gene, function (e, id) {
    mapper.get('gene', id, function (e, ve) {
      console.log(ve);
      ve.get('one2manyMapped', function (e, v) {
        console.log(e);
        //console.log(v.length);
      });
    });
  });
});
