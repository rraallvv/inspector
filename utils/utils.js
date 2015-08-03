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

            if ( k === '__mixins__' ) {
                var mixins = node[k];
                for ( var i = 0; i < mixins.length; ++i ) {
                    buildNode(mixins[i], mixins[i].__type__, clsList);
                }
                continue;
            }

            var val = node[k];
            var valAttrs;
            var valType;

            if ( clsDef.properties ) {
                valAttrs = clsDef.properties[k];
                valType = valAttrs.type;
            }

            if ( val && typeof val === 'object' ) {
                if ( val.__type__ ) {
                    valType = val.__type__;
                    delete val.__type__;
                }

                // NOTE: if we don't register the type in ui-property, we will expand it.
                if ( !Editor.properties[valType] ) {
                    buildNode( val, valType, clsList );
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

