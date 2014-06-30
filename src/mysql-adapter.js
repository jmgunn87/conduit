var async = require('async');
var _ = require('lodash');
var mysql = require('mysql');
var Adapter = require('./adapter');

module.exports = MySQLAdapter;

function MySQLAdapter(config) {
  Adapter.call(this, config);
  this.templates = config.templates || this.templates;
  this.typeMap   = config.typeMap   || this.typeMap;
}

MySQLAdapter.prototype = Object.create(Adapter.prototype);

MySQLAdapter.prototype.encoders = Object.create(Adapter.prototype.encoders);
MySQLAdapter.prototype.encoders._default = function (v, o, d) {
  if (v === null || v === undefined) v = 'NULL';
  return d(null, JSON.stringify(v));
};
MySQLAdapter.prototype.encoders.entity = function (v, o, d) {
  return d(null, parseInt(v, 10));
};
MySQLAdapter.prototype.encoders.boolean = function (v, o, d) {
  return d(null, Number(v));
};
MySQLAdapter.prototype.encoders.date = function (v, o, d) {
  return d(null,
    v.getFullYear()    + '-' +
    (v.getMonth() + 1) + '-' +
    v.getDate()
  );
};
MySQLAdapter.prototype.encoders.time     =
MySQLAdapter.prototype.encoders.datetime = function (v, o, d) {
  return d(null,
    v.getFullYear()    + '-' +
    (v.getMonth() + 1) + '-' +
    v.getDate()        + '-' +
    v.getHours()       + '-' +
    v.getMinutes()     + '-' +
    v.getSeconds()
  );
};

MySQLAdapter.prototype.decoders = Object.create(Adapter.prototype.decoders);
MySQLAdapter.prototype.decoders._default = function (v, o, d) {
  return d(null, typeof v == 'string' ? JSON.parse(v) : v);
};
MySQLAdapter.prototype.decoders.date     =
MySQLAdapter.prototype.decoders.datetime =
MySQLAdapter.prototype.decoders.time     = function (v, o, d) {
  return d(null, new Date(v));
};

MySQLAdapter.prototype.typeMap = {
  'entity': 'INTEGER',
  'object': 'TEXT',
  'array': 'TEXT',
  'string': 'VARCHAR',
  'boolean': 'BOOL',
  'float': 'FLOAT',
  'integer': 'INTEGER',
  'datetime': 'DATETIME',
  'date': 'DATETIME',
  'time': 'TIMESTAMP'
};

MySQLAdapter.prototype.templates = {
  createTable: _.template([
    'CREATE TABLE IF NOT EXISTS <%= entity %> (\n',
      '<% var first = true; %>',
      '<% for (var key in schema.fields) { %>',
        '<% if (first) { first = 0 } else { %>,\n<% } %>',
        '<% var field = schema.fields[key]; %>',
        '<%= key %> <%= types[field.type] || types["string"] %>',
        '<% if (field.length && field.type !== "float"',
                            '&& field.type !== "date"',
                            '&& field.type !== "datetime"',
                            '&& field.type !== "time"',
                            '&& field.type !== "boolean"',
                            '&& field.type !== "object"',
                            '&& field.type !== "array"',
                            '&& field.type !== "integer"',
        ') { %> (<%= parseInt(field.length, 10) || "255" %>)<% } %>',
        '<% if (schema.id === key) { %> PRIMARY KEY AUTO_INCREMENT<% } %>',
      '<% } %>',
    ' \n)'
  ].join('')),
  rebuildTable: _.template([
    'BEGIN TRANSACTION;',
    'ALTER TABLE <%= entity %> RENAME TO <%= entity %>_backup;',
    '<%= templates.createTable({ entity: entity, schema: schema, types: types  }) %>',
    'INSERT INTO <%= entity %> SELECT * FROM <%= entity %>_backup;',
    'DROP TABLE <%= entity %>_backup;',
    'COMMIT;'
  ].join('')),
  dropTable: _.template([
    'DROP TABLE <%= entity %>'
  ].join('')),
  addColumn: _.template([
    'ALTER TABLE <%= entity %> ADD COLUMN <%= name %> ',
    '<%= types[field.type] || types["string"] %>',
    '<% if (field.length) { %> (<%= parseInt(field.length, 10) %>) <% } %>',
    '<% if (schema.id === name) { %> PRIMARY KEY AUTO_INCREMENT <% } %>',
  ].join('')),
  get: _.template([
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
  put: _.template([
    'INSERT INTO <%= entity %> (<%= fields.join(",") %>) VALUES (\'<%= values.join("\',\'") %>\')',
    'ON DUPLICATE KEY UPDATE ',
    '<% var first = true; %>',
    '<% var numFields = fields.length %>',
    '<% for (var i=0; i < numFields; ++i) { %>',
      '<% if (first) { first = 0 } else { %>,\n<% } %>',
      '<%= fields[i] %> = \'<%= values[i] %>\'',
    '<% } %>'
  ].join('')),
  del: _.template([
    'DELETE FROM <%= entity %> WHERE id=<%= id %>'
  ].join(''))
};

MySQLAdapter.prototype.connect = function (callback) {
  this.client = mysql.createConnection(this.config);
  this.client.connect(callback);
};

MySQLAdapter.prototype.disconnect = function (callback) {
  this.client.end(callback);
};

MySQLAdapter.prototype._put = function (id, model, options, callback) {
  var entity = this.entity;
  var client = this.client; 
  var schema = this.schema;
  var template = options && options.template ? 
    _.template(options.template) : this.templates.put;
  var fields = Object.keys(schema.fields).filter(function (v) {
    return v !== schema.id;
  });

  delete model.id;

  try {
    client.query(template({
      entity: entity,
      fields: fields,
      values: _.values(model)
    }), [], function (err, result) {
      if (err) return callback(err);
      callback(null, result.insertId);
    });
  } catch (e) {
    return callback(e); 
  }
};

MySQLAdapter.prototype._get = function (id, options, callback) {
  var sql = '';
  var entity = this.entity;
  var client = this.client; 
  var template = options && options.template ? 
    _.template(options.template) : this.templates.get;

  options = options || {};
  if (!options.query && id) {
    options.query = {};
    options.query.id = id; 
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

  client.query(sql, [], function (err, result) {
    if (err) return callback(err);
    callback(null, result.length == 1 ? result[0] : result);
  });
};

MySQLAdapter.prototype._del = function (id, options, callback) {
  var template = options && options.template ? 
    _.template(options.template) : this.templates.del;

  try {
    this.client.query(template({ 
      entity: this.entity, 
      id: id 
    }), [], callback);
  } catch (e) { 
    return callback(e); 
  }
};
