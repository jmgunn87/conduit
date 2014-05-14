Conduit
=======

###Setup
To setup the system you must use a **Container**. A **Container** is a synchronous subclass of **Model**. The container must have an adapter.
````javascript
var container = new Container();

container.put('adapter', function () {
  return new Mapper({ container: container });
});
````

###Defining Models and Schemas
````javascript
var Model = require('./model');

module.exports = Account;

function Account(config) {
  config.schema = config.schema || Channel.schema;
  Model.call(this, config);
  this.container = config.container;
}

Account.schema = {
  entity: 'account',
  id: 'id',
  fields: {
    id       : { type: 'integer' },
    email    : { type: 'text' },
    username : { type: 'username' },
    password : { type: 'password' }
  }
};

Account.prototype = Account.create(Model.prototype);
````
models and thier schemas must be registered with the container using the proper namespace for example, the above model definition would be registered with the container like this
````javascript
container.put('account/schema', Account.schema);
container.put('account/model', function (values) {
  values.mapper = mapper;
  return new Account(values);
});
````

####Valid Schema Types
* **entity** - the value of this field should be that of a defined **Model** subclass
* **object** - a Javascript **Object** type
* **array** - a Javascript **Array** type
* **string** - a Javascript **String** type
* **boolean** - a Javascript **Boolean** type
* **float** - a javascript **Number** type
* **integer** - a javascript **Number** type
* **datetime** - javascript **Date** type
* **date** - javascript **Date** type
* **time** - javascript **Date** type

###Defining Schema Relationships
####one to one
````json
{
  type: 'entity',
  entity: <entity-name>,
  mapped: <mapped-field-name>,
  inversed: <inverse-field-name>
}
````
####one to many
````json
{
  type: 'entity',
  entity: <entity-name>,
  mapped: <mapped-field-name>,
  inversed: <inverse-field-name>
}
````
####many to one
````json
{
  type: 'entity',
  entity: <entity-name>,
  mapped: <mapped-field-name>,
  inversed: <inverse-field-name>
}
````
####many to many
````json
{
  type: 'entity',
  entity: <entity-name>,
  mapped: <mapped-field-name>,
  inversed: <inverse-field-name>
}
````

###Storage and retrieval
The mapper is used to store, fetch and delete entites from thier associated adapters. The mapper itself is a Model but with the following differences,
1. its first argument will be the entity name
2. its options arguments will be either an id or options object

The mapper depends on a container to lookup entity schemas, adapters and models and looks for them using the following key types
<br />
````<entity name>/model ````<br />
````<entity name>/schema ````<br />
````<entity name>/adapter ````<br />

each entity has its own adapter. adapters must be registered in the container.
to be mapped, a model must have a schema

####Model events
* **'put'** (key, value, options)
* **'get'** (key, value, options)
* **'del'** (key, value, options)

####Model lifecycle events + hooks
* **preUpdate** (callback)
* **postUpdate** (callback)
* **put[FieldName]** (value, options, callback)
* **get[FieldName]** (value, options, callback)
* **del[FieldName]** (value, options, callback)

###Encoding, Decoding and Validating
encoders, decoders and validators are defined at the adapter level and then also registered with the container like so
````javascript
container.put('encoder', function () {});
container.put('decoder', function () {});
container.put('validator', function () {});
````


###Insertion
````javascript
var account = container.get('account/model', {
  username : 'jmgunn87',
  password : 'somethingSecr3t'
});

container.get('adapter').put('account', account, function (e, id) {
  // 'id' will be the inserted models id
});
````
###Batch Insertion
````javascript
var accounts = [container.get('account/model', {
  username : 'jmgunn87',
  password : 'somethingSecr3t'
}), container.get('account/model', {
  username : 'gmjunn787',
  password : 'Secr3t'
})];

container.get('adapter').put('account', accounts, function (e, ids) {
  // 'ids' will be an array of inserted model id's
});
````
###Batch Entity Insertion
````javascript
var accounts = [container.get('account/model', {
  username : 'jmgunn87',
  password : 'somethingSecr3t'
}), container.get('account/model', {
  username : 'gmjunn787',
  password : 'Secr3t'
})];

var posts = [container.get('post/model', {
  title   : 'Post #1',
  date    : new Date(),
  content : '<h1>HI</h1>'
}), container.get('post/model', {
  title   : 'Post #2',
  date    : new Date(),
  content : '<p>hello world</p>'
})];

container.get('adapter').put({
  'account' : accounts,
  'posts'   : posts
}, function (e, ids) {
  // 'ids' will be an object keyed by entity name of inserted model id's
});
````


###Querying by ID
Example using the sqlite3 or leveldb adapter
````javascript
container.get('adapter').get('account', '100', function (e, result) {
  // 'result' will contain query results as single 'account' models
});
````
###Batch querying
Example using the sqlite3 adapter
````javascript
container.get('adapter').get('account', {
  query  : { username: 'jmgunn87' },
  fields : ['id', 'username'],
  offset : 10, 
  limit  : 10
}, function (e, results) {
  // 'results' will contain query results as an array of 'account' models
});
````
###Batch Entity Queries
Example using the sqlite3 or leveldb adapter
````javascript
container.get('adapter').get({
  'account' : '100',
  'order'   : '101',
  'posts'   : {
    query : { 
      title: 'Example' 
    }
  }
}, function (e, result) {
  // 'result' will contain query results as an object keyed by entity name
});
````


###Removal by ID
Example using the sqlite3 or leveldb adapter
````javascript
container.get('adapter').del('account', '100', function (e, result) {
  // 'result' will contain query results as single 'account' models
});
````
###Batch removal
Example using the sqlite3 adapter
````javascript
container.get('adapter').del('account', {
  query  : { username: 'jmgunn87' }
}, function (e) {});
````
###Batch Entity Removal
Example using the sqlite3 or leveldb adapter
````javascript
container.del('adapter').get({
  'account' : '100',
  'order'   : '101',
  'posts'   : {
    query: { 
      title: 'Example' 
    }
  }
}, function (e) {});
````

