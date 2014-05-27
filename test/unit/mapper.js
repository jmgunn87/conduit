var assert = require('assert');
var Model = require('./../../src/model');
var Container = require('./../../src/container');
var Mapper = require('./../../src/mapper');

var schemas = {};
schemas.gene = {
  entity: 'gene',
  fields: {
    id: {},
    title: {},
    symbol: {},
    locusLinkSummary: {},
    OMIMID: {},
    locusLinkid: {},
    clusterId: {},
    one2one: {
      entity: 'gene'
    },
    one2oneMapped: {
      entity: 'child',
      mapped: 'one2oneInversed'
    },
    one2many: {
      entity: 'gene'
    },
    one2manyMapped: {
      entity: 'child',
      mapped: 'one2manyInversed'
    }
  }
};

schemas.child = {
  entity: 'child',
  fields: {
    id: {},
    title: {},
    symbol: {},
    one2oneInversed: {
      entity: 'gene',
      inversed: 'one2oneMapped'
    },
    one2manyInversed: {
      entity: 'gene',
      inversed: 'one2manyMapped'
    }
  }
};

describe('Mapper', function () {
  
  var container, mapper, model, geneID, childID;

  before(function () {
    container = new Container();
    container.put('gene/schema', schemas.gene);
    container.put('child/schema', schemas.child);
    
    container.put('gene/adapter', function (p) { 
      var adapter = new Model(p);
      adapter._put = function (id, model, options, callback) {
        this.store[id] = model;
        callback(null, id);
      };
      return adapter;
    }, true);
    
    container.put('child/adapter', function (p) { 
      var adapter = new Model(p);
      adapter._put = function (id, model, options, callback) {
        this.store[id] = model;
        callback(null, id);
      };
      return adapter;
    }, true);
    
    container.put('noschema/adapter', function (p) { 
      var adapter = new Model(p);
      adapter._put = function (id, model, options, callback) {
        this.store[id] = model;
        callback(null, id);
      };
      return adapter;
    }, true);

    container.put('gene/model', function (p) { p.schema = schemas.gene; return new Model(p); });
    container.put('child/model', function (p) { p.schema = schemas.child; return new Model(p); });
    container.put('noschema/model', function (p) { p.schema = schemas.gene; return new Model(p); });
    mapper = new Mapper({ container: container });
    model = new Model({ schema: schemas.gene });
    
    model.put({
      title: 'HUMANGENOME',
      symbol: 'Labels',
      one2one: new Model({ 
        schema: schemas.gene, 
        title: 'HUMONKEYGENEOME@@@',
        symbol: 'Bnanaas'
      }),
      one2oneMapped: new Model({ 
        schema: schemas.child,
        title: 'GOATGENEE@@@',
        symbol: 'gnaaaa'
      }),
      one2many: [new Model({ 
        schema: schemas.gene, 
        title: 'FISHBALL@@@',
        symbol: 'NANG'
      }), new Model({ 
        schema: schemas.gene, 
        title: 'COW',
        symbol: 'MOO'
      })],
      one2manyMapped: [new Model({ 
        schema: schemas.child,
        title: 'MORONGENE@',
        symbol: 'EXCEL'
      }), new Model({ 
        schema: schemas.child,
        title: 'DOGCAT',
        symbol: 'MEOOF'
      })]
    });
  });

  describe('#put', function () {
    it('persists a model to its assigned adapter', function (done) {
      mapper.put('gene', model, function (err, id) {
        if (err) throw err;
        assert.ok(id);
        assert.ok(mapper.container.get('gene/adapter').store[id]);
        childID = model.get('one2oneMapped').get('id');
        geneID = id;
        done();
      });
    });
    it('persists only fields specified in its schema', function (done) {
      model.put('other', 'other', function (err) {
        if (err) throw err;
        mapper.put('gene', model, function (err, id) {
          if (err) throw err;
          assert.ok(mapper.container.get('gene/adapter').store[id]);
          assert.ok(!mapper.container.get('gene/adapter').store[id].other);
          assert.ok(!mapper.container.get('gene/adapter').store[id].one2oneInversed);
          assert.ok(!mapper.container.get('gene/adapter').store[id].one2manyInversed);
          assert.ok(!mapper.container.get('gene/adapter').store[id].one2oneMapped);
          assert.ok(!mapper.container.get('gene/adapter').store[id].one2manyMapped);
          assert.ok(mapper.container.get('gene/adapter').store[id].title);
          assert.ok(mapper.container.get('gene/adapter').store[id].symbol);
          assert.ok(mapper.container.get('gene/adapter').store[id].one2one);
          assert.ok(mapper.container.get('gene/adapter').store[id].one2many);
          assert.equal(Object.keys(mapper.container.get('gene/adapter').store).length, 5);
          assert.equal(Object.keys(mapper.container.get('child/adapter').store).length, 4);
          done();
        });
      });
    });
    it('persists any entity fields as foreign key references', function (done) {
      mapper.put('gene', model, function (err, id) {
        if (err) throw err;
        var cid = mapper.container.get('gene/adapter').store[id].one2one;
        var cidArray = mapper.container.get('gene/adapter').store[id].one2many;
        assert.ok(cid);
        assert.equal(typeof cid, 'string');
        assert.equal(typeof cidArray[0], 'string');
        assert.equal(typeof cidArray[1], 'string');
        assert.ok(mapper.container.get('gene/adapter').store[cid]); 
        done();
      });
    });
    it('persists any inversed entity fields as foreign key references', function (done) {
      mapper.put('gene', model, function (err, id) {
        if (err) throw err;
        var one2oneInversedSeen = false;
        var one2manyInversedSeen = false;
        var store = mapper.container.get('child/adapter').store;
        for (var key in store) {
          if (store[key].one2oneInversed) one2oneInversedSeen = true;
          if (store[key].one2manyInversed) one2manyInversedSeen = true;
        }
        assert.ok(one2oneInversedSeen);
        assert.ok(one2manyInversedSeen);
        done();
      });
    });
    it('does not persist a model or its children if data has not changed', function (done) {
      model.store.id = '100';
      model.clean = true;
      mapper.put('gene', model, function (err, id) {
        if (err) throw err;
        assert.ok(!mapper.container.get('gene/adapter').store[id]);
        model.clean = false;
        model.store.id = geneID;
        done();
      });
    });
    it('fires a preUpdate and postUpdate method on the model if it exists', function (done) {
      var seen = 0;
      model.preUpdate = function (c) { ++seen; c(); };
      model.postUpdate = function (c) { ++seen; c(); };
      mapper.put('gene', model, function (err, id) {
        if (err) throw err;
        assert.equal(seen, 2);
        model.postUpdate = model.preUpdate = function (c) { c(); };
        done();
      });
    });
  });
  describe('#get', function () {
    it('retrieves an entity by its id', function (done) {
      mapper.get('gene', geneID, function (err, model) {
        if (err) throw err;
        assert.ok(model);
        assert.equal(model.store.id, geneID);
        done();
      });
    });
    it('retreives an inversed field', function (done) {
      mapper.get('child', childID, function (err, model) {
        if (err) throw err;
        assert.ok(model.get('one2oneInversed'));
        done();
      });
    });
    it('retrieves all owning side related entities from all adapters', function (done) {
      mapper.get('gene', geneID, function (err, model) {
        if (err) throw err;
        model.get([
          'one2one',
          'one2many'
        ], function (err, result) {
          if (err) throw err;
          assert.ok(result.one2one);
          assert.ok(result.one2many);
          assert.equal(result.one2many.length, 2);
          done();
        });
      });
    });
    xit('retrieves all of a models related entities from all adapters', function (done) {
      mapper.get('gene', geneID, function (err, model) {
        if (err) throw err;
        model.get([
          'one2oneMapped',
          'one2manyMapped'
        ], function (err, result) {
          if (err) throw err;
          assert.ok(result.one2oneMapped);
          assert.ok(result.one2manyMapped);
          done();
        });
      });
    });
  });
  describe('#del', function () {
    it('removes an entity from its adapter and all relations', function (done) {
      mapper.del('gene', geneID, function (err) {
        if (err) throw err;
        assert.ok(!mapper.container.get('gene/adapter').store[geneID]);
        done();
      });
    });
  });
});