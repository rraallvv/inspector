function _buildProp ( node, key, clsList, path, useArray ) {
    var type = node.__type__;

    if ( !type ) {
        return;
    }

    var clsDef = clsList[type];
    if ( !clsDef ) {
        return;
    }

    if ( key === '__type__' ) {
        return;
    }

    // process mixins
    if ( key === '__mixins__' ) {
        return;
    }

    // get value
    var val = node[key];

    // get attrs
    var valAttrs;
    if ( clsDef.properties ) {
        valAttrs = clsDef.properties[key];
    }

    // skip the property if attrs not found
    if ( !valAttrs )
        return;

    // get value type
    var valType = valAttrs.type;
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

    //
    if ( val && typeof val === 'object' ) {
        // get type-chain for it
        var valClsDef = clsList[valType];
        if ( valClsDef ) {
            valAttrs.extends = valClsDef.extends;
        }

        // NOTE: if we don't register the type in ui-property, we will expand it.
        var propType = valAttrs.type;
        if ( !propType ) propType = valType;

        //
        if ( Array.isArray(val) ) {
            valType = 'Array';
        } else if ( !Editor.properties[propType] ) {
            valType = 'Object';
        }
    }

    //
    path = path + '.' + key;
    var info = {
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
    var i,k;
    if ( valType === 'Array' ) {
        for ( i = 0; i < val.length; ++i ) {
            var itemVal = val[i];

            val[i] = {
                name: '[' + i + ']',
                path: path + '.' + i,
                value: itemVal,
                type: valAttrs.type,
                attrs: valAttrs,
            };

            if ( itemVal && typeof itemVal === 'object' ) {
                var itemPath = path + '.' + i;
                for ( k in itemVal ) {
                    _buildProp( itemVal, i, clsList, itemPath + '.' + k, false );
                }
            }
        }
    } else if ( valType === 'Object' ) {
        for ( k in val ) {
            _buildProp( val, k, clsList, path + '.' + k, useArray );
        }
    }
}

var buildNode = function ( node, clsList, path, useArray ) {
    var type = node.__type__;

    if ( !type ) {
        Editor.warn('Type can not be null');
        return;
    }

    var clsDef = clsList[type];
    if ( !clsDef ) {
        Editor.warn('Can not find class define for type %s', type );
        return;
    }

    for ( var k in node ) {
        if ( k === '__type__' ) {
            continue;
        }

        // process mixins
        if ( k === '__mixins__' ) {
            var mixins = node[k];
            for ( var i = 0; i < mixins.length; ++i ) {
                buildNode(mixins[i], clsList, path, true);
            }
            continue;
        }

        //
        _buildProp( node, k, clsList, path, useArray );
    }
};

var normalizePath = function ( path ) {
    // path = path.replace( /^target\./, '' );
    // path = path.replace( /^__mixins__\.\d+\./, '' );
    var list = path.split('.');

    var result = [];
    for ( var i = 0; i < list.length; ++i ) {
        var name = list[i];
        if ( i%2 === 0 ) {
            result.push(name);
        }
    }
    return result.join('.');
};

var isMixinPath = function ( path ) {
    path = path.replace( /^target\./, '' );
    return /^__mixins__\.\d+\./.test(path);
};

// var normalizeMixinPath = function ( path ) {
//     path = path.replace( /^target\./, '' );

//     var result = path.match( /^__mixins__\.\d+/ );
//     if ( !result ) {
//         result = [];
//     }

//     if ( result.length > 0 ) {
//         path = path.substring( result[0].length+1 );
//     }

//     var list = path.split('.');

//     for ( var i = 0; i < list.length; ++i ) {
//         var name = list[i];
//         if ( i%2 === 0 ) {
//             result.push(name);
//         }
//     }

//     return result.join('.');
// };

// var getType = function ( node, path ) {
//     path = normalizeMixinPath(path);

//     var prop = Editor.JS.getPropertyByPath(node,path);
//     if ( prop )
//         return prop.type;
//     return null;
// };

module.exports = {
    buildNode: buildNode,
    normalizePath: normalizePath,
    isMixinPath: isMixinPath,
};

