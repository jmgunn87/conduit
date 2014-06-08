var async = require('async');

var a = {
  entity: 'gene',
  id: 'id',
  fields: {
    one: {},
    two: {
      type: 'entity',
      entity: 'A',
      required: true
    },
    three: {},
    four: {}
  }
};

var b = {
  entity: 'child',
  id: 'id',
  fields: {
    two: { 
      type: 'entity',
      entity: 'B'
    },
    three: {},
    four: {},
    five: {}
  }
};

function diff(a, b) {
  var diff = {};
  
  for (var key in b) {
    var bfield = b[key];
    var afield = a[key];
    
    if (!afield) {
      diff[key] = '+';
      continue;
    }

    for (var attrKey in bfield) {
      if (!afield[attrKey] || afield[attrKey] !== bfield[attrKey]) {
        diff[key] = '~';
        break;
      }
    }
    
    for (var attrKey in afield) {
      if (!bfield[attrKey]) {
        diff[key] = '~';
        break;
      }
    }
  }

  for (var key in a) {
    var afield = a[key];
    var bfield = b[key];
    if (!bfield) {
      diff[key] = '-';
    }
  }

  return diff;
}

console.log(diff(a.fields, b.fields));
