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
  return d(null, '\'' + JSON.stringify(v).replace(/"/g, '\\"') + '\'');
};
MySQLAdapter.prototype.encoders.date     =
MySQLAdapter.prototype.encoders.datetime =
MySQLAdapter.prototype.encoders.time     = function (v, o, d) {
  return MySQLAdapter.prototype.encoders._default(v.getTime(), o, d);
};

MySQLAdapter.prototype.decoders = Object.create(Adapter.prototype.decoders);
MySQLAdapter.prototype.decoders._default = function (v, o, d) {
  return d(null, typeof v == 'string' ? JSON.parse(v.replace(/\\/g, '')) : v);
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
    'INSERT INTO <%= entity %> (<%= fields.join(",") %>) VALUES (<%= values.join(",") %>)',
    'ON DUPLICATE KEY UPDATE ',
    '<% var first = true; %>',
    '<% var numFields = fields.length %>',
    '<% for (var i=0; i < numFields; ++i) { %>',
      '<% if (first) { first = 0 } else { %>,\n<% } %>',
      '<%= fields[i] %> = <%= values[i] %>',
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

MySQLAdapter.prototype.migrate = function (callback) {
  var self = this;
  var entity = this.entity;
  var schema = this.schema;
  var types = this.typeMap;
  var client = this.client;
  var templates = this.templates;

  if (!schema.fields) {
    return client.query(this.templates.dropTable({
      types: types,
      entity: entity,
      schema: schema
    }), [], callback);
  }
  
  client.query('PRAGMA table_info(' + entity + ')', [], function (err, meta) {
    if (err || !meta || !meta.length) {
      return client.query(self.templates.createTable({
        types: types,
        entity: entity,
        schema: schema
      }), [], callback);
    }

    var seen = [];
    var rebuild = false;
    var metaLength = meta.length;
    for (var i=0; i < metaLength; ++i) {
      var metaField = meta[i];
      var field = schema.fields[metaField.name];

      if (!field) {
        rebuild = true;
        break;
      }

      seen.push(metaField.name);

      var type = /(.*) (\((.*)\))/.exec(metaField.type) || [,metaField.type];
      var typeName = type[1];
      var typeLength = type[3] ? parseInt(type[3], 10) : undefined;
      var fieldTypeName = types[field.type] || types.string;
      var fieldLength = field.length ? parseInt(field.length, 10) : undefined;
      if (typeName !== fieldTypeName ||
          typeLength !== fieldLength ||
          (metaField.pk && schema.id !== metaField.name)) {
        rebuild = true;
        break;
      }
    }

    if (!rebuild) {
      var migration = [];
      for(var key in schema) {
        if (seen.indexOf(key) === -1) {
          migration.push(self.templates.addColumn({
            name: key,
            types: types,
            entity: entity,
            schema: schema,
            field: schema[key]
          }));
          continue;
        }
      }
      return client.query(migration.join(';\n'), [], callback);
    }

    client.query(self.templates.rebuildTable({
      types: types,
      entity: entity,
      schema: schema,
      templates: templates
    }), [], callback);
  });
};

MySQLAdapter.prototype._put = function (id, model, options, callback) {
  var self = this;
  var entity = this.entity;
  var schema = this.schema;
  var client = this.client; 
  var template = options && options.template ? 
    _.template(options.template) : this.templates.put;
  var fields = Object.keys(schema.fields).filter(function (v) {
    return v !== schema.id;
  });

  this.encoder.transcode(model, schema, function (err, values) {
    if (err) return callback(err);
    delete values.id;
    console.log(template({
        entity: entity,
        fields: fields,
        values: _.values(values)
      }));

    try {
      client.query(template({
        entity: entity,
        fields: fields,
        values: _.values(values)
      }), [], function (err) {
        callback(err, this.lastID);
      });
    } catch (e) {
      return callback(e); 
    }
  });
};

MySQLAdapter.prototype._get = function (id, options, callback) {
  var self = this;
  var sql = '';
  var entity = this.entity;
  var schema = this.schema;
  var client = this.client; 
  var decoder = this.decoder;
  var template = options && options.template ? 
    _.template(options.template) : this.templates.get;

  options = options || {};
  if (!options.query && id) {
    options.query = {};
    options.query.id = id; 
  }

  client.serialize(function() {
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

    client.all(sql, [], function (err, result) {
      if (err) return callback(err);
      async.map(result, function (item, done) { 
        decoder.transcode(item, schema, done);
      }, callback);
    });

  });
};

MySQLAdapter.prototype._del = function (id, options, callback) {
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

MySQLAdapter.prototype.exec = function (sql, options, callback) {
  var client = this.client; 
  client.serialize(function() { 
    client.run(sql, options, callback); 
  });
};
