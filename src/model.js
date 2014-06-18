var EventEmitter = require('events').EventEmitter;
var async = require('async');
var  _ = require('lodash');

module.exports = Model;

function Model(config) {
  config = config || {};
  EventEmitter.call(this);
  this.mapper = config.mapper;
  this.parent = config.parent;
  this.schema = config.schema || {};
  this.store = config;
  this.clean = false;
}

Model.prototype = Object.create(EventEmitter.prototype);

['put', 'get', 'del', 'hook'].forEach(function (key) {
  Model.prototype[key] = function () {
    return this._dispatch(key, 
      Array.prototype.slice.call(arguments, 0)
    ); 
  };
});

Model.prototype._dispatch = function (methodName, args) {
  var sync = false;
  var keyType = typeof args[0];
  var offset = methodName === 'put' && 
    keyType !== 'object' ? 2 : 1 ;

  if (typeof args[offset] === 'function') {
    args[offset + 1] = args[offset + 1] || args[offset];
    args[offset] = undefined;
  } else if (!args[offset + 1]) {
    sync = true; 
    args[offset + 1] = function (err, value) {
      if (err) throw err;
      return value;
    };
  }

  if (keyType === 'object') {
    return sync ? this._syncBatch(methodName, args[0]) :  
      this._asyncBatch(methodName, args[0], args[offset + 1]);
  } 

  try {
    this.emit.apply(this, [methodName].concat(args));
    return this['_' + methodName].apply(this, args);
  } catch (err) {
    return args[offset + 1](err);
  }
};

Model.prototype._syncBatch = function (methodName, batch) {
  var self = this;
  return _.reduce(batch, function (reduction, value, key) {
    if (typeof key === 'number') key = value;
    reduction[key] = self[methodName](key, value);
    return reduction;
  }, {});
};

Model.prototype._asyncBatch = function (methodName, batch, done) {
  var self = this;
  return async.parallel(_.reduce(batch, function (reduction, options, key) {
    if (typeof key === 'number') key = options;
    reduction[key] = function (callback) {
      self[methodName](key, options, callback);
    };
    return reduction;
  }, {}), done);
};

Model.prototype._put = function (key, value, options, done) {
  var field = this.schema && this.schema.fields &&
    this.schema.fields[key] || {};

  if (field.mapped) {
    var mappedField = field.mapped;
    if (_.isArray(value)) {
      for(var i=0, l = value.length; i < l; ++i) {
        if (value[i] instanceof Model) { 
          value[i].store[mappedField] = this; 
          value[i].clean = false;
        }
      }
    } else if (value instanceof Model) {
      value.store[mappedField] = this; 
      value.clean = false;
    }
  }

  this.clean = false;
  return done(null, this.store[key] = value); 
};

Model.prototype._get = function (key, options, done) {
  var mapper = this.mapper;
  var value = this.store[key];
  var field = this.schema && this.schema.fields &&
    this.schema.fields[key] || {};
  
  if (field.entity && mapper) {
    if (typeof value === 'string') {
      return mapper.get(field.entity, value, done);
    } else if (_.isArray(value)) {
      return async.parallel(_.reduce(value, function (reduction, value) {
        reduction.push(function (callback) {
          if (value instanceof Model) return callback(null, value);
          mapper.get(field.entity, value, callback);
        });
        return reduction;
      }, []), done);
    } else if (!value && field.mapped) {
      options = Object(options);
      options.query = options.query || {};
      options.query[field.mapped] = this.store.id;
      return mapper.get(field.entity, options, done);
    }
  }

  return !value && this.parent ? 
    this.parent._get(key, options, done) : 
    done(null, value);
};

Model.prototype._del = function (key, options, done) {
  this.clean = false;
  return done(null, delete this.store[key]);
};

Model.prototype._hook = function (key, options, done) {
  var self = this;
  if (this[key]) {
    return !_.isArray(this[key]) ?
      this[key](done) :
      async.mapSeries(this[key], function (hook, callback) {
        hook.call(self, callback);
      }, done);
  }
  return done();
};
