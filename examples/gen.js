var _ = lodash = require('lodash');
var async = require('async');

var gene = {
  entity: 'gene',
  id: 'id',
  fields: {
    id: { type: 'integer' },
    tag: { type: 'text' },
    one2one: {
      type: 'entity',
      entity: 'gene'
    },
    many2one: {
      type: 'entity',
      entity: 'gene'
    },
    one2oneMapped: {
      type: 'entity',
      entity: 'child',
      mapped: 'one2oneInversed'
    },
    one2manyMapped: {
      type: 'entity',
      entity: 'child',
      mapped: 'one2manyInversed'
    }
  }
};

var child = {
  entity: 'child',
  id: 'id',
  fields: {
    id: { type: 'integer' },
    tag: { type: 'text' },
    one2oneInversed: {
      type: 'entity',
      entity: 'gene',
      inversed: 'one2oneMapped'
    },
    one2manyInversed: {
      type: 'entity',
      entity: 'gene',
      inversed: 'one2manyMapped'
    }
  }
};

var guzzleTemplate = _.template([
'    namespace <%= namespace %>;',
'\n',
'    use Guzzle\Common\Collection;',
'    use Guzzle\Service\Client;',
'\n',
'    class <%= entity %>Client extends Client',
'    {',
'        public function __construct($baseUrl, $scheme, $sub, $version)',
'        {',
'            parent::__construct($baseUrl);',
'            $this->scheme = $scheme;',
'            $this->sub = $sub;',
'            $this->version = $version;',
'        }',
'    }'
].join('\n'));

/*console.log(guzzleTemplate({ 
  namespace:'poofarm', 
  entity: 'wanksta' 
}));*/

var markdownTemplate = _.template([
'Parameters',
'----------',
'| field name  | type  | description  |',
'|:------------|:------|:-------------|',
'<% for(var fieldName in schema.fields) { %>'        +
'<% var field = schema.fields[fieldName] %>'         +
'|<%= fieldName %>|<%= field.type %>| blahblahblah|' ,
'<% } %>',
'HTTP Methods',
'------------',
'| method  | endpoint  | content type | return code | description |',
'|:------------|:------|:-------------|:------------|-------------|',
'| POST | <%= baseUrl %>/<%= schema.entity %>/ | application/json | 201 CREATED | create an entity |',
'| PUT | <%= baseUrl %>/<%= schema.entity %>/:id | application/json | 200 OK | update and entity |',
'| GET | <%= baseUrl %>/<%= schema.entity %>/ | application/json | 200 OK | get all entites |',
'| GET | <%= baseUrl %>/<%= schema.entity %>/:id | application/json | 200 OK | get an entity |',
'| DELETE | <%= baseUrl %>/<%= schema.entity %>/:id | application/json | 204 NO CONTENT | delete an entity |',
].join('\n'));


console.log(markdownTemplate({ 
  schema: gene,
  baseUrl: 'http://gene.com/api/v1.1'
}));
