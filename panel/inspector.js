(function () {
var Fs = require('fire-fs');
var Path = require('fire-path');
var DiffPatch = require('jsondiffpatch');
var Utils = Editor.require('packages://inspector/utils/utils');

var _url2imported = {};
var _diffpatcher = DiffPatch.create({});

Editor.registerPanel( 'inspector.panel', {
    is: 'editor-inspector',

    listeners: {
        'meta-revert': '_onMetaRevert',
        'meta-apply': '_onMetaApply',
        'resize': '_onResize',
        'panel-show': '_onPanelShow',
    },

    properties: {
    },

    ready: function () {
        this.reset();
    },

    reset: function () {
        this._curInspector = null;
        this._selectID = '';
        this._selectType = '';
    },

    startInspect: function ( type, id ) {
        //
        if ( this._queryID ) {
            this.cancelAsync(this._queryID);
            this._queryID = null;
        }

        //
        if ( !id ) {
            if ( this._selectType === type ) {
                this.uninspect();
            }
            return;
        }

        //
        this._selectType = type;
        this._selectID = id;

        //
        if ( type === 'asset' ) {
            this._loadMeta( id, function ( err, metaType, meta ) {
                if ( err ) {
                    Editor.error( 'Failed to load meta %s, Message: %s', id, err.stack);
                    return;
                }
                this.inspect( metaType, meta.uuid, meta );
            }.bind(this));

            return;
        }

        //
        if ( type === 'node' ) {
            Editor.sendToPanel('scene.panel', 'scene:query-node', id );

            return;
        }
    },

    inspect: function ( type, id, obj ) {
        this._loadInspector ( type, function ( err, element ) {
            if ( this._selectID !== id )
                return;

            this._removeContent();

            if ( element ) {
                element.dirty = false;
                element.target = obj;
                element._rebuilding = false;
                element._type = this._selectType;

                // observe changes
                if ( this._selectType === 'asset' ) {
                    element.addEventListener( 'target-changed', function ( event ) {
                        if ( element._rebuilding )
                            return;

                        element.dirty = true;
                    });
                }
                else if ( this._selectType === 'node' ) {
                    element.addEventListener( 'target-changed', function ( event ) {
                        if ( element._rebuilding )
                            return;

                        element.dirty = true;
                        Editor.sendToPanel('scene.panel', 'scene:node-set-property',
                                           id,
                                           Utils.normalizePath(event.detail.path),
                                           event.detail.value,
                                           Utils.isMixinPath(event.detail.path)
                                          );
                    });
                }

                var contentDOM = Polymer.dom(this.$.content);
                contentDOM.appendChild(element);

                //
                this._curInspector = element;
            }
        }.bind(this));
    },

    uninspect: function () {
        this.reset();
        this._removeContent();
    },

    _removeContent: function () {
        var contentDOM = Polymer.dom(this.$.content);
        if ( contentDOM.children.length > 0 ) {
            contentDOM.removeChild( contentDOM.children[0] );
        }
    },

    _loadInspector: function ( type, cb ) {
        var url = Editor.inspectors[type];
        if ( url === undefined ) {
            if ( cb ) cb ( new Error ( 'Can not find inspector for type %s', type ) );
            return;
        }

        // EXAMPLE 1: Fire.Texture ==> fire-texture
        // EXAMPLE 2: fooBar ==> foo-bar
        var prefix = type.replace(/([a-z][A-Z])/g, function (g) {
            return g[0] + '-' + g[1];
        });
        prefix = prefix.replace(/\./g, '-' ).toLowerCase();

        //
        if ( _url2imported[url] ) {
            var el = document.createElement( prefix + '-inspector');
            if ( cb ) cb ( null, el );
            return;
        }

        Polymer.Base.importHref( url, function ( event ) {
            _url2imported[url] = true;
            var el = document.createElement( prefix + '-inspector');
            if ( cb ) cb ( null, el );
        }, function ( err ) {
            if ( cb ) cb ( err );
        });
    },

    _loadMeta ( id, cb ) {
        if ( id.indexOf('mount-') === 0 ) {
            if ( cb ) cb ( null, 'mount', {
                __name__: id.substring(6),
                __path__: '',
                uuid: id,
            } );
            return;
        }

        Editor.assetdb.queryPathByUuid( id, function ( fspath ) {
            if ( !fspath ) {
                if ( cb ) cb ( new Error('Can not find asset path by uuid ' + id) );
                return;
            }

            var metapath = fspath + '.meta';
            jsonObj = JSON.parse(Fs.readFileSync(metapath));

            var metaType = jsonObj['meta-type'];
            var metaCtor = Editor.metas[metaType];
            if ( !metaCtor ) {
                if ( cb ) cb ( new Error('Can not find meta by type ' + metaType) );
                return;
            }

            var meta = new metaCtor();
            meta.deserialize(jsonObj);
            meta.__name__ = Path.basenameNoExt(fspath);
            meta.__path__ = fspath;

            if ( cb ) cb ( null, metaType, meta );
        }.bind(this));
    },

    _onMetaRevert: function ( event ) {
        event.stopPropagation();

        var id = event.detail.uuid;

        //
        this._loadMeta( id, function ( err, metaType, meta ) {
            if ( err ) {
                Editor.error( 'Failed to load meta %s, Message: %s', id, err.stack);
                return;
            }
            this.inspect( metaType, meta.uuid, meta );
        }.bind(this));
    },

    _onMetaApply: function ( event ) {
        event.stopPropagation();

        Editor.info('@jwu please finish this by sending assetdb:apply(meta)');
    },

    _onResize: function ( event ) {
        if ( this._curInspector && this._curInspector.resize )
            this._curInspector.resize();
    },

    _onPanelShow: function ( event ) {
        if ( this._curInspector && this._curInspector.resize )
            this._curInspector.resize();
    },

    'selection:activated': function ( type, id ) {
        this.startInspect( type, id );
    },

    'scene:reply-query-node': function ( nodeInfo ) {
        var node = nodeInfo.value;
        var id = node.id;
        var type = node.__type__;
        var clsList = nodeInfo.types;

        //
        if ( this._selectType !== 'node' || this._selectID !== id )
            return;

        // rebuild target
        Utils.buildNode( node, type, clsList );

        // if current inspector is node-inspector and have the same id
        if ( this._curInspector &&
             this._curInspector._type === 'node' &&
             this._curInspector.target.id.value === id
           )
        {
            var delta = _diffpatcher.diff( this._curInspector.target, node );
            if ( delta ) {
                this._curInspector._rebuilding = true;
                for ( var p in delta ) {
                    this._curInspector.set( 'target.' + p, node[p] );
                }
                this._curInspector._rebuilding = false;
            }
        }
        else {
            this.inspect( type, id, node );
        }

        //
        this._queryID = this.async( function () {
            this._queryID = null;
            Editor.sendToPanel('scene.panel', 'scene:query-node', id );
        }, 100 );
    },
});

})();
