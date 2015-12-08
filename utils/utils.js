'use strict';

function _buildProp ( node, nodeType, key, clsList, path, useArray, valAttrs ) {
  let clsDef = clsList[nodeType];
  if ( !clsDef ) {
    return;
  }

  if ( key === '__type__' ) {
    return;
  }

  // process comps
  if ( key === '__comps__' ) {
    return;
  }

  // get value
  let val = node[key];

  // get attrs
  if ( !valAttrs && clsDef.properties ) {
    valAttrs = clsDef.properties[key];
  }

  // skip the property if attrs not found
  if ( !valAttrs )
    return;

  // skip hidden properties
  if ( valAttrs.visible === false )
    return;

  // get value type
  let valType = valAttrs.type;
  if ( val && typeof val === 'object' && val.__type__ ) {
    valType = val.__type__;
    delete val.__type__;
  }

  // skip the property if it is array and attrs.type not defined
  if ( Array.isArray(val) && !valAttrs.type ) {
    return;
  }

  // skip the property if visible === false and type not found
  if ( valAttrs.visible === false && !valType ) {
    return;
  }

  // get type-chain for it
  let valClsDef = clsList[valType];
  if ( valClsDef ) {
    valAttrs.typename = valClsDef.name;
    if ( valClsDef.extends ) {
      valAttrs.extends = valClsDef.extends.slice();
    }
  }

  //
  if ( val && typeof val === 'object' ) {
    // NOTE: if we don't register the type in ui-property, we will expand it.
    let propType = valAttrs.type;
    if ( !propType ) propType = valType;

    //
    if ( Array.isArray(val) ) {
      valType = 'Array';
    } else if ( Editor.properties && !Editor.properties[propType] ) {
      if (
        !valAttrs.extends ||
        (
          valAttrs.extends.indexOf('cc.Node') === -1 &&
          valAttrs.extends.indexOf('cc.Component') === -1 &&
          valAttrs.extends.indexOf('cc.RawAsset') === -1
        )
      ) {
        valType = 'Object';
      }
    }
  }

  //
  path = path + '.' + key;
  let info = {
    name: key,
    path: path,
    value: val,
    type: valType ? valType : '',
    attrs: valAttrs,
  };

  if ( useArray ) {
    if ( !node.__props__ ) {
      node.__props__ = [];
    }
    node.__props__.push(info);
    delete node[key];
  } else {
    node[key] = info;
  }

  //
  if ( valType === 'Array' ) {
    for ( let i = 0; i < val.length; ++i ) {
      let itemVal = val[i];
      if ( itemVal && typeof itemVal === 'object' ) {
        // clone the valAttrs
        let itemAttrs = {};
        for ( let p in valAttrs ) {
          itemAttrs[p] = valAttrs[p];
        }

        _buildProp( val, itemAttrs.type, i, clsList, path, false, itemAttrs );
        val[i].name = '[' + i + ']';
      } else {
        val[i] = {
          name: '[' + i + ']',
          path: path + '.' + i,
          value: itemVal,
          type: valAttrs.type,
          attrs: valAttrs,
        };
      }
    }
  } else if ( valType === 'Object' ) {
    for ( let k in val ) {
      _buildProp( val, valAttrs.type, k, clsList, path, true );
    }
  } else {
    // if this is not a cc.ValueType and it has been register in Editor.properties
    // that means users wants to customize its ui-control
    let expand = !clsDef.extends || clsDef.extends.lastIndexOf('cc.ValueType') === -1;

    if ( expand ) {
      for ( let k in val ) {
        _buildProp( val, valAttrs.type, k, clsList, path, false );
      }
    }
  }
}

let buildNode = function ( node, clsList, path, useArray ) {
  let type = node.__type__;

  if ( !type ) {
    Editor.warn('Type can not be null');
    return;
  }

  let clsDef = clsList[type];
  if ( clsDef ) {
    if ( clsDef.editor ) {
      node.__editor__ = clsDef.editor;
    }
    if ( clsDef.name ) {
      node.__displayName__ = clsDef.name;
    }
  }

  for ( let k in node ) {
    if ( k === '__type__' ) {
      continue;
    }

    // process comps
    if ( k === '__comps__' ) {
      let comps = node[k];
      for ( let i = 0; i < comps.length; ++i ) {
        buildNode(comps[i], clsList, path + '.__comps__.' + i, true);
      }
      continue;
    }

    //
    if ( node.__editor__ && node.__editor__.inspector ) {
      useArray = false;
    }

    _buildProp( node, type, k, clsList, path, useArray );
  }
};

function normalizePath ( path ) {
  path = path.replace( /^target\./, '' );
  path = path.replace( /^__comps__\.\d+\./, '' );

  return path;
}

let _compReg = /^target\.__comps__\.\d+/;

function isCompPath ( path ) {
  return _compReg.test(path);
}

function compPath ( path ) {
  let matches = _compReg.exec(path);
  if ( matches ) {
    return matches[0];
  }
  return '';
}

function stripValueInPath ( path ) {
  let list = path.split('.');

  let result = [];
  for ( let i = 0; i < list.length; ++i ) {
    let name = list[i];
    if ( i%2 === 0 ) {
      result.push(name);
    }
  }
  return result.join('.');
}

module.exports = {
  buildNode: buildNode,
  isCompPath: isCompPath,
  compPath: compPath,
  normalizePath: normalizePath,
  stripValueInPath: stripValueInPath,
};

