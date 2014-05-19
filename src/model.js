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
    args[offset + 1] = function (e, v) {
      if (e) throw e;
      return v;
    };
  }

  if (keyType === 'object') {
    return sync ? this._syncBatch(methodName, args[0]) :  
      this._asyncBatch(methodName, args[0], args[offset + 1]);
  } 

  args[0] = String(args[0]);

  this.emit.apply(this, [methodName].concat(args));
  
  var camelKey = methodName + 
    args[0].charAt(0).toUpperCase() + args[0].substr(1);    
  
  try {
    return this[camelKey] ?
      this[camelKey].apply(this, args.slice(1)) :
      this["_" + methodName].apply(this, args);
  } catch (err) {
    return args[offset + 1](err);
  }
};

Model.prototype._syncBatch = function (methodName, batch) {
  var self = this;
  return _.reduce(batch, function (r, v, k) {
    if (typeof k === 'number') k = v;
    r[k] = self[methodName](k, v);
    return r;
  }, {});
};

Model.prototype._asyncBatch = function (methodName, batch, done) {
  var self = this;
  return async.parallel(_.reduce(batch, function (r, d, n) {
    if (typeof n === 'number') n = d;
    r[n] = function (cb) {
      self[methodName](n, d, cb);
    };
    return r;
  }, {}), done);
};

["put", "get", "del"].forEach(function (key) {
  Model.prototype[key] = function () {
    return this._dispatch(key, 
      Array.prototype.slice.call(arguments, 0)
    ); 
  };
});

Model.prototype._put = function (k, v, o, done) {
  this.clean = false;
  if (this.schema.fields && this.schema.fields[k]) {
    var field = this.schema.fields[k];
    var mappedField = field.mapped;
    if (mappedField) {
      if (_.isArray(v)) {
        for(var i=0, l = v.length; i < l; ++i) {
          v[i].store[mappedField] = this; 
          v[i].clean = false;
        }
      } else {
        v.store[mappedField] = this; 
        v.clean = false;
      }
    }
  }

  return done(null, this.store[k] = v); 
};

Model.prototype._get = function (k, o, done) {
  var value = this.store[k];
  var field = this.schema  && this.schema.fields ? 
    this.schema.fields[k] : {};
  
  if (field && field.entity && this.mapper) {
    if (typeof value === 'string') {
      return this.mapper.get(field.entity, value, done);
    } else if (!value && field.mapped) {
      o = Object(o);
      o.query = o.query || {};
      o.query[field.mapped] = this.store.id;
      return this.mapper.get(field.entity, o, done);
    }
  }

  return !value && this.parent ? 
    this.parent._get(k, o, done) : done(null, value);
};

Model.prototype._del = function (k, o, done) {
  this.clean = false;
  return done(null, delete this.store[k]); 
};

Model.prototype.preUpdate = 
Model.prototype.postUpdate = 
function (done) { 
  done(); 
};
