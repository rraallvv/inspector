'use strict';

function _buildProp ( node, nodeType, key, clsList, path, useArray, valAttrs ) {
    var clsDef = clsList[nodeType];
    if ( !clsDef ) {
        return;
    }

    if ( key === '__type__' ) {
        return;
    }

    // process mixins
    if ( key === '__comps__' ) {
        return;
    }

    // get value
    var val = node[key];

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
        if ( valClsDef && valClsDef.extends ) {
            valAttrs.extends = valClsDef.extends.slice();
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
            if ( itemVal && typeof itemVal === 'object' ) {
                // clone the valAttrs
                var itemAttrs = {};
                for ( var p in valAttrs ) {
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
        for ( k in val ) {
            _buildProp( val, valAttrs.type, k, clsList, path, true );
        }
    }
}

var buildNode = function ( node, clsList, path, useArray ) {
    var type = node.__type__;

    if ( !type ) {
        Editor.warn('Type can not be null');
        return;
    }

    for ( var k in node ) {
        if ( k === '__type__' ) {
            continue;
        }

        // process mixins
        if ( k === '__comps__' ) {
            var mixins = node[k];
            for ( var i = 0; i < mixins.length; ++i ) {
                buildNode(mixins[i], clsList, path + '.__comps__.' + i, true);
            }
            continue;
        }

        //
        _buildProp( node, type, k, clsList, path, useArray );
    }
};

var normalizePath = function ( path ) {
    path = path.replace( /^target\./, '' );
    path = path.replace( /^__comps__\.\d+\./, '' );

    return path;
};

var _mixinReg = /^target\.__comps__\.\d+/;

var isMixinPath = function ( path ) {
    return _mixinReg.test(path);
};

var mixinPath = function ( path ) {
    var matches = _mixinReg.exec(path);
    if ( matches ) return matches[0];
    return '';
};

var stripValueInPath = function ( path ) {
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

module.exports = {
    buildNode: buildNode,
    isMixinPath: isMixinPath,
    mixinPath: mixinPath,
    normalizePath: normalizePath,
    stripValueInPath: stripValueInPath,
};

