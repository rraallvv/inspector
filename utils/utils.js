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

                buildNode( val, valType, clsList );
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

module.exports = {
    buildNode: buildNode,
    normalizePath: normalizePath,
};
