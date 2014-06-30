module.exports = {
  TestEntity: {
    entity: 'TestEntity',
    id: 'id',
    fields: { 
      id       : { type: 'integer' },
      entity   : { type: 'entity',   entity: 'OtherTest' },
      object   : { type: 'object',   index: true, length: 255 },
      array    : { type: 'array',    index: true, length: 255 },
      string   : { type: 'string',   index: true, length: 255 },
      boolean  : { type: 'boolean',  index: true, length: 1   },
      float    : { type: 'float',    index: true, length: 255 },
      integer  : { type: 'integer',  index: true, length: 255 },
      date     : { type: 'date',     index: true, length: 255 },
      datetime : { type: 'datetime', index: true, length: 255 },
      time     : { type: 'time',     index: true, length: 255 }
    }
  }
};