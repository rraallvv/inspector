var buildNode = function ( node, type, clsList, useArray ) {
    var clsDef;

    if ( type ) {
        clsDef = clsList[type];
    } else {
        Editor.warn('Can not find class define for type %s', type );
    }

    if ( clsDef ) {
        for ( var k in node ) {
            if ( k === '__type__' ) {
                continue;
            }

            // process mixins
            if ( k === '__mixins__' ) {
                var mixins = node[k];
                for ( var i = 0; i < mixins.length; ++i ) {
                    buildNode(mixins[i], mixins[i].__type__, clsList);
                }
                continue;
            }

            // get value
            var val = node[k];

            // get attrs
            var valAttrs;
            if ( clsDef.properties ) {
                valAttrs = clsDef.properties[k];
            }

            // skip the property if attrs not found
            if ( !valAttrs )
                continue;

            // get value type
            var valType = valAttrs.type;
            if ( val && typeof val === 'object' && val.__type__ ) {
                valType = val.__type__;
                delete val.__type__;
            }

            // skip the property if it is array and attrs.type not defined
            if ( Array.isArray(val) && !valAttrs.type ) {
                continue;
            }

            // skip the property if visible === false and type not found
            if ( valAttrs.visible === false && !valType ) {
                continue;
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

                    for ( var j = 0; j < val.length; ++j ) {
                        buildNode( val[j], propType, clsList );
                    }
                } else {
                    if ( !Editor.properties[propType] ) {
                        buildNode( val, propType, clsList );
                    }
                }
            }

            node[k] = {
                name: k,
                attrs: valAttrs,
                type: valType ? valType : '',
                value: val,
            };
        }
    }
};

var normalizePath = function ( path ) {
    path = path.replace( /^target\./, '' );
    path = path.replace( /^__mixins__\.\d+\./, '' );
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

var normalizeMixinPath = function ( path ) {
    path = path.replace( /^target\./, '' );

    var result = path.match( /^__mixins__\.\d+/ );
    if ( !result ) {
        result = [];
    }

    if ( result.length > 0 ) {
        path = path.substring( result[0].length+1 );
    }

    var list = path.split('.');

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

var getType = function ( node, path ) {
    path = normalizeMixinPath(path);

    var prop = Editor.JS.getPropertyByPath(node,path);
    if ( prop )
        return prop.type;
    return null;
};

module.exports = {
    buildNode: buildNode,
    normalizePath: normalizePath,
    isMixinPath: isMixinPath,
    getType: getType,
};

