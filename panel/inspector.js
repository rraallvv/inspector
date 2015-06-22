(function () {
var Fs = require('fire-fs');
var Path = require('fire-path');

Editor.registerPanel( 'inspector.panel', {
    is: 'editor-inspector',

    properties: {
    },

    ready: function () {
        this.targetName = '';
    },

    inspect: function ( type, obj ) {
    },

    'selection:activated': function ( type, id ) {
        if ( type === 'asset' ) {
            var fspath = Editor.assetdb.remote._uuid2path[id];
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
