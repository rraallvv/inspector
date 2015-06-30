(function () {
var Fs = require('fire-fs');
var Path = require('fire-path');

var _url2imported = {};

Editor.registerPanel( 'inspector.panel', {
    is: 'editor-inspector',

    properties: {
    },

    ready: function () {
        this.targetName = '';
        this.curTarget = null;
    },

    inspect: function ( type, obj ) {
        this._loadInspector ( type, function ( err, element ) {
            var contentDOM = Polymer.dom(this.$.content);
            if ( contentDOM.firstChild ) {
                contentDOM.removeChild( contentDOM.firstChild );
            }

            if ( element ) {
                element.name = this.targetName;
                element.target = obj;
                contentDOM.appendChild(element);

                // observe
                this.curTarget = obj;
                this._observer = function ( changes ) {
                    element.dirty = true;
                }.bind(this);
                Object.observe( this.curTarget, this._observer );
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

    'selection:activated': function ( type, id ) {
        // unobserve
        if ( this._observer ) {
            Object.unobserve( this.curTarget, this._observer );
            this._observer = null;
            this.curTarget = null;
        }

        //
        if ( type === 'asset' ) {
            var fspath = Editor.assetdb.remote.uuidToFspath(id);
            if ( fspath ) {
                this.set('targetName', Path.basenameNoExt(fspath));
                var metapath = fspath + '.meta';
                jsonObj = JSON.parse(Fs.readFileSync(metapath));

                var metaType = jsonObj['meta-type'];
                var metaCtor = Editor.metas[metaType];
                if ( metaCtor ) {
                    var meta = new metaCtor();
                    meta.deserialize(jsonObj);

                    this.inspect( metaType, meta );
                }
            }
        }
    },
});

})();
