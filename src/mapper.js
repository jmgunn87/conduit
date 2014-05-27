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
  var self = this;
  this.map(entity, instance, function (schema, instance, data, done) {
    if (instance.clean) return done(null, data.id);
    data.id = data.id || uuid.v4();
    instance.preUpdate(function (err) {
      if (err) return done(err);
      self.container
        .get(schema.entity + '/adapter')
        .put(data.id, data, function (err, id) {
          if (err) return done(err);
          instance.store.id = id;
          instance.clean = true;
          instance.postUpdate(function (err) {
            if (err) return done(err);
            done(err, id);
          });
      });
    });
  }, done);
};

Mapper.prototype._get = function(entity, id, done) {
  var self = this;
  var options = {}; 
  if (typeof id === 'object') {
    options = id;
    id = undefined;
  }

  self.container.get(entity + '/adapter')
    .get(id, options, function (err, result) {
      if (err) return done(err);
      done(null, !_.isArray(result) ?
        self.container.get(entity + '/model', result) :
        _.map(result, function (model) {
          return self.container.get(entity + '/model', result);
        }));
    });
};

Mapper.prototype._del = function(entity, id, done) {
  var self = this;
  self.container
    .get(entity + '/adapter')
    .get(id, function (e, data) {
      var model = self.container.get(entity + '/model', data);
      self.map(entity, model, function (schema, instance, data, done) {
        instance.preUpdate(function (err) {
          if (err) return done(err);
          self.container
            .get(schema.entity + '/adapter')
            .del(instance.store.id || data.id, function (err) {
              if (err) return done(err);
              instance.postUpdate(done);
            });
        });
      }, done);
    });
};

Mapper.prototype.map = function(entity, instance, method, done) {
  var schema = this.container.get(entity + '/schema');
  this.mapField(schema, instance, method, done);
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
  this.container.get(field.entity + '/adapter')
    .get(value, function (err, reference) {
      if (err) return done(err, reference);
      var model = self.container.get(field.entity + '/model', reference);
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
  var schema = this.container.get(field.entity + '/schema') || {};
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
