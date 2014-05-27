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

SQLite3Adapter.typeMap = {
  'entity': 'INTEGER',
  'object': 'CLOB',
  'array': 'CLOB',
  'string': 'VARCHAR',
  'boolean': 'INTEGER',
  'float': 'FLOAT',
  'integer': 'INTEGER',
  'datetime': 'DATETIME',
  'date': 'DATETIME',
  'time': 'TIMESTAMP'
};

SQLite3Adapter.templates = {
  createTable: _.template([
    'CREATE TABLE IF NOT EXISTS <%= entity %> (',
      '<% var first = true; %>',
      '<% for (var key in schema.fields) { %>',
        '<% if (first) { first = 0 } else { %>, <% } %>',
        '<% var field = schema.fields[key]; %>',
        '<%= key %> <%= types[field.type] || types["string"] %>',
        '<% if (field.length) { %> (<%= parseInt(field.length, 10) %>) <% } %>',
        '<% if (schema.id === key) { %> PRIMARY KEY AUTOINCREMENT <% } %>',
      '<% } %>',
    ');'
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
    '<% if (schema.id === key) { %> PRIMARY KEY AUTOINCREMENT <% } %>',
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
    'INSERT OR REPLACE INTO <%= entity %> (<%= fields.join(",") %>) VALUES (<%= values.join(",") %>)',
  ].join('')),
  del: _.template([
    'DELETE FROM <%= entity %> WHERE id=<%= id %>'
  ].join(''))
};

function SQLite3Adapter(config) {
  this.config = config;
  this.entity = config.entity;
  this.container = config.container;
  this.templates = config.templates || SQLite3Adapter.templates;
  this.typeMap = config.typeMap || SQLite3Adapter.typeMap;
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

SQLite3Adapter.prototype.migrate = function (callback) {
  var self = this;
  var entity = this.entity;
  var schema = this.schema;
  var types = this.typeMap;
  var client = this.client;
  var templates = this.templates;

  if (!schema.fields) {
    return this.exec(this.templates.dropTable({
      types: types,
      entity: entity,
      schema: schema
    }), [], callback);
  }
  
  client.serialize(function() {
    client.all('PRAGMA table_info(' + entity + ')', [], function (err, meta) {
      if (err || !meta || !meta.length) {
        return self.exec(self.templates.createTable({
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
        var fieldTypeName = types[field.type] || types["string"];
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
        return self.exec(migration.join(';\n'), [], callback);
      }

      self.exec(self.templates.rebuildTable({
        types: types,
        entity: entity,
        schema: schema,
        templates: templates
      }), [], callback);
    });
  });
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

    try {
      self.exec(template({
        entity: entity,
        fields: fields,
        values: values
      }), [], function (err) {
        callback(err, this.lastID);
      });
    } catch (e) {
      return callback(e); 
    }
  });
};

SQLite3Adapter.prototype._get = function (id, options, callback) {
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

  try {
    this.exec(template({ 
      entity: this.entity, 
      id: id 
    }), [], callback);
  } catch (e) { 
    return callback(e); 
  }
};

SQLite3Adapter.prototype.exec = function (sql, options, callback) {
  var client = this.client; 
  client.serialize(function() { 
    client.run(sql, options, callback); 
  });
};
