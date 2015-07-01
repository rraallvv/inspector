(function () {
var Fs = require('fire-fs');
var Path = require('fire-path');

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
    },

    inspect: function ( id, type, obj ) {
        this._loadInspector ( type, function ( err, element ) {
            var contentDOM = Polymer.dom(this.$.content);
            if ( contentDOM.firstChild ) {
                contentDOM.removeChild( contentDOM.firstChild );
            }

            if ( this._selectID !== id )
                return;

            if ( element ) {
                element.name = this.name;
                element.path = this.path;
                element.dirty = false;
                element.target = obj;
                contentDOM.appendChild(element);

                //
                this._curInspector = element;

                // observe
                this._curTarget = obj;
                if ( this._curTarget ) {
                    this._observer = function ( changes ) {
                        element.dirty = true;
                    }.bind(this);
                    Object.observe( this._curTarget, this._observer );
                }
            }
        }.bind(this));
    },

    _loadInspector: function ( type, cb ) {
        var url = Editor.inspectors[type];
        if ( url === undefined ) {
            if ( cb ) cb ( new Error ( 'Can not find inspector for type %s', type ) );
            return;
        }

        if ( _url2imported[url] ) {
            var el = document.createElement( type + '-inspector');
            if ( cb ) cb ( null, el );
            return;
        }

        Polymer.Base.importHref( url, function ( event ) {
            _url2imported[url] = true;
            var el = document.createElement( type + '-inspector');
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

        // unobserve
        if ( this._observer && this._curTarget ) {
            Object.unobserve( this._curTarget, this._observer );
            this._observer = null;
            this._curTarget = null;
        }

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

        // unobserve
        if ( this._observer && this._curTarget ) {
            Object.unobserve( this._curTarget, this._observer );
            this._observer = null;
            this._curTarget = null;
        }

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
        // TODO
        this.inspect( nodeInfo.id, nodeInfo.type, nodeInfo );
    },
});

})();
