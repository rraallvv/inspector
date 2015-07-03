(function () {
var Fs = require('fire-fs');
var Path = require('fire-path');
var Utils = Editor.require('packages://inspector/utils/utils');

var _url2imported = {};

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
        this.name = '';
        this.path = '';
        this._curTarget = null;
        this._curInspector = null;
        this._selectID = '';
        this._selectType = '';
    },

    uninspect: function () {
        this._removeContent();
    },

    inspect: function ( id, type, obj ) {
        this._loadInspector ( type, function ( err, element ) {
            this._removeContent();

            if ( this._selectID !== id )
                return;

            if ( element ) {
                element.name = this.name;
                element.path = this.path;
                element.dirty = false;
                element.target = obj;

                // observe changes
                if ( this._selectType === 'asset' ) {
                    element.addEventListener( 'target-changed', function ( event ) {
                        element.dirty = true;
                    });
                }
                else if ( this._selectType === 'node' ) {
                    element.addEventListener( 'target-changed', function ( event ) {
                        element.dirty = true;
                        Editor.sendToPanel('scene.panel', 'scene:node-set-property',
                                           id,
                                           Utils.normalizePath(event.detail.path, 'target'),
                                           event.detail.value
                                          );
                    });
                }

                var contentDOM = Polymer.dom(this.$.content);
                contentDOM.appendChild(element);

                //
                this._curInspector = element;
                this._curTarget = obj;
            }
        }.bind(this));
    },

    _removeContent: function () {
        var contentDOM = Polymer.dom(this.$.content);
        if ( contentDOM.firstChild ) {
            contentDOM.removeChild( contentDOM.firstChild );
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
            this.name = id.substring(6);
            this.path = '';
            if ( cb ) cb ( null, 'mount', {
                uuid: id,
            } );
            return;
        }

        Editor.assetdb.queryPathByUuid( id, function ( fspath ) {
            if ( !fspath ) {
                if ( cb ) cb ( new Error('Can not find asset path by uuid ' + id) );
                return;
            }

            this.name = Path.basenameNoExt(fspath);
            this.path = fspath;
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

            if ( cb ) cb ( null, metaType, meta );
        }.bind(this));
    },

    _onMetaRevert: function ( event ) {
        event.stopPropagation();

        var id = this._curTarget.uuid;

        //
        this._loadMeta( id, function ( err, metaType, meta ) {
            if ( err ) {
                Editor.error( 'Failed to load meta %s, Message: %s', id, err.stack);
                return;
            }
            this.inspect( meta.uuid, metaType, meta );
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
        this._selectID = id;

        //
        if ( !id ) {
            if ( this._selectType === type ) {
                this._removeContent();
            }
            return;
        }

        //
        this._selectType = type;

        //
        if ( type === 'asset' ) {
            this._loadMeta( id, function ( err, metaType, meta ) {
                if ( err ) {
                    Editor.error( 'Failed to load meta %s, Message: %s', id, err.stack);
                    return;
                }
                this.inspect( meta.uuid, metaType, meta );
            }.bind(this));

            return;
        }

        //
        if ( type === 'node' ) {
            Editor.sendToPanel('scene.panel', 'scene:query-node', id );

            return;
        }
    },

    'scene:reply-query-node': function ( nodeInfo ) {
        // rebuild target
        Utils.buildNode( nodeInfo.value, nodeInfo.types );
        var target = nodeInfo.value;

        this.inspect( target.id.value, target.__type__, target );
    },
});

})();
