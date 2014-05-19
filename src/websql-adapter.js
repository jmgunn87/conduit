var Model = require('./model');
var async = require('async');
var _ = require('lodash');

module.exports = WebSQLAdapter;

WebSQLAdapter.encoders = {};
WebSQLAdapter.encoders.object = 
WebSQLAdapter.encoders.array = 
WebSQLAdapter.encoders.boolean = function (v, o, d) {
  return d(null, "'" + JSON.stringify(v || '').replace(/"/g, '\\"') + "'");
};

WebSQLAdapter.decoders = {};
WebSQLAdapter.decoders.object = 
WebSQLAdapter.decoders.array = 
WebSQLAdapter.decoders.boolean = function (v, o, d) {
  return d(null, v ? JSON.parse(v.replace(/\\/g, '')) : v);
};

WebSQLAdapter.validators = {};

WebSQLAdapter.templates = {
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

function WebSQLAdapter(config) {
  this.config = config;
  this.entity = config.entity;
  this.templates = config.templates || WebSQLAdapter.templates;
  this.container = config.container;
  this.schema = config.schema = this.container.get(
    this.entity + '/schema'
  );
  Model.call(this, config);
}

WebSQLAdapter.prototype = Object.create(Model.prototype);

WebSQLAdapter.prototype.connect = function (callback) {
  try {
    callback(null, this.client = openDatabase(
      this.config.name, 
      this.config.version || '0.0.0',
      this.config.description || '', 
      this.config.size || (2 * 1024 * 1024)
    ));
  } catch (err) {
    callback(err);
  }
};

WebSQLAdapter.prototype.disconnect = function (callback) {
  this.client.close(callback);
};

WebSQLAdapter.prototype.createTable = function (callback) {
  try {
    this.exec(this.templates.createTable({
      entity: this.entity,
      schema: this.schema,
    }), [], callback);
  } catch (e) {
    return callback(e); 
  }
};

WebSQLAdapter.prototype.dropTable = function (callback) {
  this.exec(this.templates.dropTable({ 
    entity: this.entity 
  }), [], callback);
};

WebSQLAdapter.prototype._put = function (id, model, options, callback) {
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
    var encoder = WebSQLAdapter.encoders[field.type];
    encoder ? encoder(model[fieldName], {}, callback) :
      callback(null, model[fieldName] ? 
               "'" + model[fieldName] + "'" : 
               "NULL");

  }, function (err, values) {
    if (err) return callback(err);

    try {
      self.exec(template({
        entity: entity,
        fields: fields,
        values: values
      }), [], function (err, id) {
        callback(err, id);
      });
    } catch (e) {
      return callback(e); 
    }
  });
};

WebSQLAdapter.prototype._get = function (id, options, callback) {
  var self = this;
  var sql = '';
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

  try {
    sql = template({
      entity: entity,
      fields: options.fields,
      query: options.query,
      offset: options.offset,
      limit: options.limit
    });
  } catch (e) {
    return callback(e); 
  }

  this.exec(sql, [], function (err, result) {
    if (err) return callback(err);
    async.map(result, function (item, done) { 
      async.parallel(_.reduce(item, function (r, v, fieldName) {
        r[fieldName] = function (callback) {
          var field = schema.fields[fieldName];
          var decoder = WebSQLAdapter.decoders[field.type];
          decoder ? decoder(v, {}, callback) : callback(null, v);
        };
        return r;
      }, {}), done);
    }, callback);
  });
};

WebSQLAdapter.prototype._del = function (id, options, callback) {
  var template = options && options.template ? 
    _.template(options.template) : this.templates.del;

  try {
    this.exec(template({ 
      entity: this.entity, 
      id: id 
    }), [], callback);
  } catch (e) { 
    return callback(e); 
  }
};

WebSQLAdapter.prototype.exec = function (sql, options, callback) {
  var client = this.client;
  client.transaction(function (tx) {
    tx.executeSql(sql, options, function (tx, results) {
      if (results.rowsAffected === 1) return callback(null, results.insertId);
      var arrayRows = [];
      var rows = results.rows;
      var numRows = rows.length;
      for (var i=0; i < numRows; ++i) {
        arrayRows.push(rows.item(i));
      }
      callback(null, arrayRows);
    }, callback);
  });
};
