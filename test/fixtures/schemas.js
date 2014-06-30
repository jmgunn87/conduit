module.exports = {
  TestEntity: {
    entity: 'TestEntity',
    id: 'id',
    fields: { 
      id       : { type: 'integer' },
      _entity   : { type: 'entity',   entity: 'OtherTest' },
      _object   : { type: 'object',   index: true, length: 255 },
      _array    : { type: 'array',    index: true, length: 255 },
      _string   : { type: 'string',   index: true, length: 255 },
      _boolean  : { type: 'boolean',  index: true, length: 1   },
      _float    : { type: 'float',    index: true, length: 255 },
      _integer  : { type: 'integer',  index: true, length: 255 },
      _date     : { type: 'date',     index: true, length: 255 },
      _datetime : { type: 'datetime', index: true, length: 255 },
      _time     : { type: 'time',     index: true, length: 255 }
    }
  }
};