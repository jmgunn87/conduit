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
    var isNew = data.id ? false : true;
    var adapter = self.container.get(schema.entity + '/adapter');
    data.id = data.id || uuid.v4();

    instance.hook([
      isNew ? 'preCreate' : '', 'preUpdate'
    ], function (err) {
      if (err) return done(err);
      adapter.validator.validate(data, instance.schema, function (err, valid) {
        if (!valid) return done(new Error('validation error'));
        adapter.encoder.transcode(data, instance.schema, function (err, encoded) {
          if (err) return done(err);
          adapter.put(encoded.id, encoded, function (err, id) {
            if (err) return done(err);
            instance.store.id = id;
            instance.clean = true;
            instance.hook([
              isNew ? 'postCreate' : '', 'postUpdate'
            ], function (err) {
              if (err) return done(err);
              done(err, id);
            });
          });
        });
      });
    });
  }, done);
};

Mapper.prototype._get = function(entity, id, done) {
  var self = this;
  var adapter = self.container.get(entity + '/adapter');
  var schema = self.container.get(entity + '/schema');
  var decoder = adapter.decoder;
  var options = {}; 
  if (typeof id === 'object') {
    options = id;
    id = undefined;
  }

  adapter.get(id, options, function (err, result) {
    if (err) return done(err);
    var isArray = _.isArray(result);
    async.map(isArray ? result : [result], function (item, done) { 
      decoder.transcode(item, schema, done);
    }, function (err, decoded) {
      if (err) return done(err);
      done(null, !isArray ?
        self.container.get(entity + '/model', decoded[0]) :
        _.map(decoded, function (model) {
          return self.container.get(entity + '/model', model);
        }));
    });
  });
};

Mapper.prototype._del = function(entity, id, done) {
  var self = this;
  self.container
    .get(entity + '/adapter')
    .get(id, function (err, data) {
      if (err) return done(err);
      var model = self.container.get(entity + '/model', data);
      model.hook('preDelete', function (err) {
        if (err) return done(err);
        self.container
          .get(entity + '/adapter')
          .del(model.store.id, function (err) {
            if (err) return done(err);
            model.hook('postDelete', done);
          });
      });
    });
};

Mapper.prototype.map = function(entity, instance, method, done) {
  var schema = this.container.get(entity + '/schema');
  this.mapField(schema, instance, method, done);
};

Mapper.prototype.mapField = function (field, value, method, done) {
  if (field.entity && _.isArray(value)) {
    this.mapCollection(field, value, method, done);
  } else if (field.entity && value instanceof Model) {
    return field.inversed ? done(null, value.store.id) :
      this.mapModel(field, value, method, done);
  } else {
    done(null, value);
  }
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
      self.mapField(field, model.store[key], method, callback);
    };
    return result;
  }, {}), function (err, result) {
    if (err) return done(err);
    method.call(self, field, model, result, function (err, result) {
      if (err) return done(err);
      async.parallel(mapped, function (err) {
        done(err, result);
      });
    });
  });
};
