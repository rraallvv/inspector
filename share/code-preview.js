Editor.registerElement({
    properties: {
        type: {
            type: String,
            value: 'unknown',
            observer: '_typeChanged'
        },

        path: {
            type: String,
            value: '',
            observer: '_pathChanged'
        },
    },

    _pathChanged: function () {
        if ( !this.path || this.type === 'unknown' )
            return;

        this._highlightCode();
    },

    _typeChanged: function () {
        if ( !this.path || this.type === 'unknown' )
            return;

        this._highlightCode();
    },

    _highlightCode: function () {
        var Hljs = require('highlight.js');
        var Fs = require('fire-fs');

        var text = Fs.readFileSync( this.path, {encoding: 'utf-8'} );
        var result = Hljs.highlight( this.type, text );

        var codeDOM = Polymer.dom(this.$.code);
        codeDOM.innerHTML = result.value;
        // console.log(result);
    },
});
