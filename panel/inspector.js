(function () {
var Fs = require('fire-fs');
var Path = require('fire-path');

var _url2imported = {};

Editor.registerPanel( 'inspector.panel', {
    is: 'editor-inspector',

    listeners: {
        'meta-revert': '_onMetaRevert',
        'meta-apply': '_onMetaApply',
        'resize': '_onResize'
    },

    properties: {
    },

    ready: function () {
        this.name = '';
        this.path = '';
        this.curTarget = null;
        this.curInspector = null;
    },

    inspect: function ( type, obj ) {
        this._loadInspector ( type, function ( err, element ) {
            var contentDOM = Polymer.dom(this.$.content);
            if ( contentDOM.firstChild ) {
                contentDOM.removeChild( contentDOM.firstChild );
            }

            if ( element ) {
                element.name = this.name;
                element.path = this.path;
                element.dirty = false;
                element.target = obj;
                contentDOM.appendChild(element);

                //
                this.curInspector = element;

                // observe
                this.curTarget = obj;
                if ( this.curTarget ) {
                    this._observer = function ( changes ) {
                        element.dirty = true;
                    }.bind(this);
                    Object.observe( this.curTarget, this._observer );
                }
            }
        }.bind(this));
    },

    _loadInspector: function ( type, cb ) {
        var url = Editor.inspectors[type];
        if ( url === undefined ) {
            if ( cb ) cb ();
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
            return;
        }, function ( err ) {
            Editor.error( 'Failed to load %s. message: %s', url, err.message );
        });
    },

    _loadMeta ( id, cb ) {
        if ( id.indexOf('mount-') === 0 ) {
            this.name = id.substring(6);
            this.path = '';
            if ( cb ) cb ( null, 'mount' );
            return;
        }

        var fspath = Editor.assetdb.remote.uuidToFspath(id);
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
    },

    _onMetaRevert: function ( event ) {
        event.stopPropagation();

        var id = this.curTarget.uuid;

        // unobserve
        if ( this._observer && this.curTarget ) {
            Object.unobserve( this.curTarget, this._observer );
            this._observer = null;
            this.curTarget = null;
        }

        //
        this._loadMeta( id, function ( err, metaType, meta ) {
            if ( err ) {
                Editor.error( 'Failed to load meta %s, Message: %s', id, err.stack);
                return;
            }
            this.inspect( metaType, meta );
        }.bind(this));
    },

    _onMetaApply: function ( event ) {
        event.stopPropagation();

        Editor.info('@jwu please finish this by sending assetdb:apply(meta)');
    },

    _onResize: function ( event ) {
        if ( this.curInspector && this.curInspector.resize )
            this.curInspector.resize();
    },

    'selection:activated': function ( type, id ) {
        // unobserve
        if ( this._observer && this.curTarget ) {
            Object.unobserve( this.curTarget, this._observer );
            this._observer = null;
            this.curTarget = null;
        }

        //
        if ( type === 'asset' ) {
            this._loadMeta( id, function ( err, metaType, meta ) {
                if ( err ) {
                    Editor.error( 'Failed to load meta %s, Message: %s', id, err.stack);
                    return;
                }
                this.inspect( metaType, meta );
            }.bind(this));
        }
    },
});

})();
