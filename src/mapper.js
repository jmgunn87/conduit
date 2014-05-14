var async = require('async');
var  _ = require('lodash');
var uuid = require('node-uuid');
var Model = require('./model');

module.exports = Mapper;

function Mapper(config) {
  this.container = config.container;
  Model.call(this, config);
}

Mapper.prototype = Object.create(Model.prototype);

Mapper.prototype._put = function(entity, instance, options, done) {
  var s = this;
  this.map(entity, instance, function (e, i, r, d) {
    if (i.clean) return d(null, r.id);
    r.id = r.id || uuid.v4();
    i.preUpdate(function (err) {
      if (err) return d(err);
      s.container.get(e.entity + '-adapter')
        .put(r.id, r, function (err, id) {
          if (err) return d(err);
          i.store.id = id;
          i.clean = true;
          i.postUpdate(function (err) {
            if (err) return d(err);
            d(err, id);
          });
      });
    });
  }, done);
};

Mapper.prototype._get = function(entity, id, done) {
  var s = this;
  var options = {}; 
    
  if (typeof id === 'object') {
    options = id;
    id = undefined;
  }

  s.container.get(entity + '-adapter')
    .get(id, options, function (e, v) {
      if (e) return done(e);
      if (_.isArray(v)) {
        var numResults = v.length;
        for (var i=0; i < numResults; ++i) {
          v[i] = s.container.get(entity + '-model', v[i]);
        }
        if (id) {//this is not a collection
          v = v[0];
        }
      } else {
        v = s.container.get(entity + '-model', v);
      }
      done(null, v);
    });
};

Mapper.prototype._del = function(entity, id, done) {
  var s = this;
  s.container
    .get(entity + '-adapter')
    .get(id, function (e, v) {
      s.map(entity, s.container.get(entity + '-model', v), function (e, i, r, d) {
        i.preUpdate(function (err) {
          if (err) return d(err);
          s.container.get(e.entity + '-adapter')
            .del(i.store.id || r.id, function (err) {
              if (err) return d(err);
              i.postUpdate(d);
            });
        });
      }, done);
    });
};

Mapper.prototype.map = function(entity, instance, method, done) {
  this.mapField(this.container.get(entity + '-schema'), instance, method, done);
};

Mapper.prototype.mapField = function (field, value, method, done) {
  if (field.entity && (_.isString(value) || _.isNumber(value))) {
    this.mapForeignKey(field, value, method, done);
  } else if (field.entity && _.isArray(value)) {
    this.mapCollection(field, value, method, done);
  } else if (field.entity && value) {
    return field.inversed ? done(null, value.store.id) :
      this.mapModel(field, value, method, done);
  } else {
    done(null, value);
  }
};

Mapper.prototype.mapForeignKey = function (field, value, method, done) {
  var self = this;
  this.container.get(field.entity + '-adapter')
    .get(value, function (err, reference) {
      if (err) return done(err, reference);
      var model = self.container.get(field.entity + '-model', reference);
      self.mapField(field, model, method, done);
  });
};

Mapper.prototype.mapCollection = function (field, value, method, done) {
  var self = this;
  async.map(value, function (item, callback) {
    self.mapField(field, item, method, callback);
  }, done);
};

Mapper.prototype.mapModel = function (field, model, method, done) {
  var self = this;
  var mapped = {};
  var schema = this.container.get(field.entity + '-schema') || {};
  async.parallel(_.reduce(schema.fields || {}, function (result, field, key) {
    var reduction = field.mapped ? mapped : result;
    reduction[key] = function (callback) {
      model.get(key, function (err, value) {
        if (err) return callback(err);
        self.mapField(field, value, method, callback);
      });
    };
    return result;
  }, {}), function (err, result) {
    method.call(self, field, model, result, function (err, result) {
      async.parallel(mapped, function (err) {
        done(err, result);
      });
    });
  });
};
