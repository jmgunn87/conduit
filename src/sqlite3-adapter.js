var Model = require('./model');
var sqlite3 = require('sqlite3').verbose();
var async = require('async');
var _ = require('lodash');

module.exports = SQLite3Adapter;

SQLite3Adapter.encoders = {};
SQLite3Adapter.encoders.object = 
SQLite3Adapter.encoders.array = 
SQLite3Adapter.encoders.boolean = function (v, o, d) {
  return d(null, "'" + JSON.stringify(v || '').replace(/"/g, '\\"') + "'");
};

SQLite3Adapter.decoders = {};
SQLite3Adapter.decoders.object = 
SQLite3Adapter.decoders.array = 
SQLite3Adapter.decoders.boolean = function (v, o, d) {
  return d(null, v ? JSON.parse(v.replace(/\\/g, '')) : v);
};

SQLite3Adapter.validators = {};

SQLite3Adapter.templates = {
  'createTable': _.template([
    'CREATE TABLE IF NOT EXISTS <%= entity %> (',
      '<% var first = true; %>',
      '<% for (var key in schema.fields) { %>',
        '<% if (first) { first = 0 } else { %>, <% } %>',
        '<% var field = schema.fields[key]; %>',
        '<%= key %>',
        '<% if (field.type === "entity")          { %> INTEGER',
        '<% } else if (field.type === "object")   { %> CLOB',
        '<% } else if (field.type === "array")    { %> CLOB',
        '<% } else if (field.type === "string")   { %> VARCHAR',
        '<% } else if (field.type === "boolean")  { %> INTEGER',
        '<% } else if (field.type === "float")    { %> FLOAT',
        '<% } else if (field.type === "integer")  { %> INTEGER',
        '<% } else if (field.type === "datetime") { %> DATETIME',
        '<% } else if (field.type === "date")     { %> DATETIME',
        '<% } else if (field.type === "time")     { %> TIMESTAMP',
        '<% } else { %> VARCHAR<% } ; %>',
        '<% if (field.length) { %> (<%= parseInt(field.length, 10) %>) <% } %>',
        '<% if (schema.id === key) { %> PRIMARY KEY AUTOINCREMENT <% } %>',
      '<% } %>',
    ');'
  ].join('')),
  'dropTable': _.template([
    'DROP TABLE <%= entity %>'
  ].join('')),
  'get': _.template([
    'SELECT <%= fields ? fields.join(",") : "*" %> FROM <%= entity %>',
    '<% if (query) { %> WHERE ',
      '<% var first = true; %>',
      '<% for (var key in query) { %>',
        '<% if (first) { first = 0 } else if (query[key]) { %> AND <% } %>',
        '<% if (query[key]) { %><%= key %>=\'<%= query[key] %>\'<% } %>',
      '<% } %>',
    '<% } %>',
    '<% if (limit) { %> LIMIT <%= limit  %> <% } %>',
    '<% if (offset) { %> OFFSET <%= offset %> <% } %> '
  ].join('')),
  'put': _.template([
    'INSERT INTO <%= entity %> (<%= fields.join(",") %>) VALUES (<%= values.join(",") %>)',
  ].join('')),
  'del': _.template([
    'DELETE FROM <%= entity %> WHERE id=<%= id %>'
  ].join(''))
};

function SQLite3Adapter(config) {
  this.config = config;
  this.entity = config.entity;
  this.templates = config.templates || SQLite3Adapter.templates;
  this.container = config.container;
  this.schema = config.schema = this.container.get(
    this.entity + '/schema'
  );
  Model.call(this, config);
}

SQLite3Adapter.prototype = Object.create(Model.prototype);

SQLite3Adapter.prototype.connect = function (callback) {
  this.client = new sqlite3.Database(this.config.path, callback);
};

SQLite3Adapter.prototype.disconnect = function (callback) {
  this.client.close(callback);
};

SQLite3Adapter.prototype.createTable = function (callback) {
  this.exec(this.templates.createTable({
    entity: this.entity,
    schema: this.schema,
  }), [], callback);
};

SQLite3Adapter.prototype.dropTable = function (callback) {
  this.exec(this.templates.dropTable({ 
    entity: this.entity 
  }), [], callback);
};

SQLite3Adapter.prototype._put = function (id, model, options, callback) {
  var self = this;
  var entity = this.entity;
  var schema = this.schema;
  var template = options && options.template ? 
    _.template(options.template) : this.templates.put;
  var fields = Object.keys(schema.fields).filter(function (v) {
    return v !== schema.id;
  });

  async.map(fields, function (fieldName, callback) {
    var field = schema.fields[fieldName];
    var encoder = SQLite3Adapter.encoders[field.type];
    encoder ? encoder(model[fieldName], {}, callback) :
      callback(null, model[fieldName] ? 
               "'" + model[fieldName] + "'" : 
               "NULL");

  }, function (err, values) {
    if (err) return callback(err);
    self.exec(template({
      entity: entity,
      fields: fields,
      values: values
    }), [], function (err) {
      callback(err, this.lastID);
    });
  });
};

SQLite3Adapter.prototype._get = function (id, options, callback) {
  var self = this;
  var entity = this.entity;
  var schema = this.schema;
  var client = this.client; 
  var template = options && options.template ? 
    _.template(options.template) : this.templates.get;

  options = options || {};
  if (!options.query && id !== 'undefined') {
    options.query = {};
    options.query.id = 
      id !== 'undefined' ? id : undefined;
  }

  client.serialize(function() {
    client.all(template({
      entity: entity,
      fields: options.fields,
      query: options.query,
      offset: options.offset,
      limit: options.limit
    }), [], function (err, result) {
      if (err) return callback(err);
      async.map(result, function (item, done) { 
        async.parallel(_.reduce(item, function (r, v, fieldName) {
          r[fieldName] = function (callback) {
            var field = schema.fields[fieldName];
            var decoder = SQLite3Adapter.decoders[field.type];
            decoder ? decoder(v, {}, callback) : callback(null, v);
          };
          return r;
        }, {}), done);
      }, callback);
    });
  });
};

SQLite3Adapter.prototype._del = function (id, options, callback) {
  var template = options && options.template ? 
    _.template(options.template) : this.templates.del;

  this.exec(template({
    entity: this.entity,
    id: id
  }), [], callback);
};

SQLite3Adapter.prototype.exec = function (sql, options, callback) {
  var client = this.client; 
  client.serialize(function() { 
    client.run(sql, options, callback); 
  });
};
