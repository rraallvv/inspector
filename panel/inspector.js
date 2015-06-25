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
    },

    inspect: function ( type, obj ) {
        this._loadInspector ( type, function ( err, element ) {
            if ( element ) {
                element.target = obj;

                var contentDOM = Polymer.dom(this.$.content);
                contentDOM.removeChild( contentDOM.firstChild );
                contentDOM.appendChild(element);
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
