(function () {
var Fs = require('fire-fs');
var Path = require('fire-path');
var DiffPatch = require('jsondiffpatch');
var Utils = Editor.require('packages://inspector/utils/utils');

var _url2imported = {};
var _diffpatcher = DiffPatch.create({
    // objcectHash: function ( obj, index ) {
    //     // try to find an id property, otherwise just use the index in the array
    //     return obj.__type__ || '$$index:' + index;
    // },
    arrays: {
        detectMove: true
    }
});

Editor.registerPanel( 'inspector.panel', {
    is: 'editor-inspector',

    behaviors: [EditorUI.droppable],

    hostAttributes: {
        'droppable': 'asset',
        'single-drop': true,
    },

    listeners: {
        'resize': '_onResize',
        'panel-show': '_onPanelShow',
        'dragover': '_onDragOver',
        'drop-area-enter': '_onDropAreaEnter',
        'drop-area-leave': '_onDropAreaLeave',
        'drop-area-accept': '_onDropAreaAccept',
        'meta-revert': '_onMetaRevert',
        'meta-apply': '_onMetaApply',
        'node-unmixin': '_onNodeUnmixin',
    },

    properties: {
        dropAccepted: {
            type: Boolean,
            value: false,
        },

        inspectState: {
            type: String,
            value: 'uninspect',
            readOnly: true,
        },
    },

    ready: function () {
        this._initDroppable(this);

        this.reset();
    },

    reset: function () {
        this._curInspector = null;
        this._inspectType = '';
        this._selectID = '';
        this._selectType = '';
        this.hideLoader();
    },

    refresh: function () {
        this.startInspect( this._selectType, this._selectID );
    },

    startInspect: function ( type, id, timeout ) {
        if ( typeof timeout !== 'number' ) {
            timeout = 0;
        }

        //
        if ( !id ) {
            if ( this._selectType === type ) {
                this.uninspect();
            }
            return;
        }

        this._setInspectState('connecting');
        this.showLoaderAfter(200);

        //
        this._selectType = type;
        this._selectID = id;


        this.cancelAsync(this._inspectID);
        this._inspectID = this.async ( function () {
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
                this._queryNodeAfter( id, 0 );
                return;
            }
        }, timeout );
    },

    inspect: function ( type, id, obj ) {
        this._inspectType = type;
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
                        this._queryNodeAfter( id, 100 );
                    }.bind(this));
                    this._queryNodeAfter( id, 100 );
                }

                var contentDOM = Polymer.dom(this.$.content);
                contentDOM.appendChild(element);

                //
                this._curInspector = element;
                this._setInspectState('inspecting');
                this.hideLoader();
            }
        }.bind(this));
    },

    uninspect: function () {
        this.reset();
        this._removeContent();
        this._setInspectState('uninspect');
    },

    showLoaderAfter ( timeout ) {
        if ( this.$.loader.hidden === false )
            return;

        if ( this._loaderID )
            return;

        this._loaderID = this.async( function () {
            this.$.loader.hidden = false;
            this._loaderID = null;
        }, timeout);
    },

    hideLoader () {
        this.cancelAsync(this._loaderID);
        this._loaderID = null;
        this.$.loader.hidden = true;
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

        EditorUI.import( url, function ( err ) {
            if ( err ) {
                if ( cb ) cb ( err );
                return;
            }

            _url2imported[url] = true;
            var el = document.createElement( prefix + '-inspector');
            if ( cb ) cb ( null, el );
        });
    },

    _loadMeta: function ( id, cb ) {
        if ( id.indexOf('mount-') === 0 ) {
            if ( cb ) cb ( null, 'mount', {
                __name__: id.substring(6),
                __path__: '',
                uuid: id,
            } );
            return;
        }

        Editor.assetdb.queryMetaInfoByUuid( id, function ( info ) {
            if ( !info ) {
                if ( cb ) cb ( new Error('Can not find asset path by uuid ' + id) );
                return;
            }

            var jsonObj = JSON.parse(info.json);
            var metaType = jsonObj['meta-type'];
            var metaCtor = Editor.metas[metaType];
            if ( !metaCtor ) {
                if ( cb ) cb ( new Error('Can not find meta by type ' + metaType) );
                return;
            }

            var meta = new metaCtor();
            meta.deserialize(jsonObj);
            meta.__name__ = Path.basenameNoExt(info.assetPath);
            meta.__path__ = info.assetPath;
            meta.__mtime__ = info.assetMtime;

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

        var uuid = this._curInspector.target.uuid;
        var jsonString = JSON.stringify(this._curInspector.target);

        Editor.assetdb.saveMeta( uuid, jsonString );
    },

    _onNodeUnmixin: function ( event ) {
        event.stopPropagation();

        Editor.sendToPanel('scene.panel', 'scene:node-unmixin',
                           this._selectID,
                           event.detail.className
                          );
        // FIXME, HACK
        var selectType = this._selectType;
        var selectID = this._selectID;
        this.uninspect();
        this.startInspect( selectType, selectID );
    },

    _onResize: function ( event ) {
        if ( this._curInspector && this._curInspector.resize )
            this._curInspector.resize();
    },

    _onPanelShow: function ( event ) {
        if ( this._curInspector && this._curInspector.resize )
            this._curInspector.resize();
    },

    // drag & drop

    _onDragOver: function ( event ) {
        var type = EditorUI.DragDrop.type(event.dataTransfer);
        if ( type !== 'asset' ) {
            return;
        }

        event.preventDefault();

        if ( !this._curInspector ||
             this._curInspector._type !== 'node' )
        {
            return;
        }

        //
        event.stopPropagation();

        //
        if ( this.dropAccepted ) {
            EditorUI.DragDrop.updateDropEffect(event.dataTransfer, 'copy');
        }
        else {
            EditorUI.DragDrop.updateDropEffect(event.dataTransfer, 'none');
        }
    },

    _onDropAreaEnter: function ( event ) {
        event.stopPropagation();

        if ( !this._curInspector ||
             this._curInspector._type !== 'node' )
        {
            return;
        }

        var dragItems = event.detail.dragItems;
        Editor.assetdb.queryInfoByUuid( dragItems[0], function ( info ) {
            var metaType = info['meta-type'];
            if ( metaType === 'javascript' ||
                 metaType === 'coffeescript'
               ) {
                this.dropAccepted = true;
                EditorUI.DragDrop.allowDrop( event.detail.dataTransfer, true );
            }
        }.bind(this));
    },

    _onDropAreaLeave: function ( event ) {
        event.stopPropagation();

        if ( !this._curInspector ||
             this._curInspector._type !== 'node' )
        {
            return;
        }

        this.dropAccepted = false;
    },

    _onDropAreaAccept: function ( event ) {
        event.stopPropagation();

        if ( !this._curInspector ||
             this._curInspector._type !== 'node' )
        {
            return;
        }

        this.dropAccepted = false;
        Editor.Selection.cancel();

        //
        var dragItems = event.detail.dragItems;
        var uuid = dragItems[0];
        Editor.sendToPanel('scene.panel', 'scene:node-mixin',
                           this._selectID,
                           uuid
                          );
    },

    'selection:activated': function ( type, id ) {
        this.startInspect( type, id, 100 );
    },

    'scene:reply-query-node': function ( queryID, nodeInfo ) {
        var node = nodeInfo.value;
        if ( !node )
            return;

        var id = node.uuid;
        var type = node.__type__;
        var clsList = nodeInfo.types;

        //
        if ( this._queryID !== queryID ) {
            return;
        }

        //
        if ( this._selectType !== 'node' || this._selectID !== id ) {
            return;
        }

        // rebuild target
        Utils.buildNode( node, type, clsList );

        // if current inspector is node-inspector and have the same id
        if ( this._curInspector &&
             this._curInspector._type === 'node' &&
             this._curInspector.target.uuid.value === id
           )
        {
            var delta = _diffpatcher.diff( this._curInspector.target, node );
            if ( delta ) {
                this._curInspector._rebuilding = true;
                this._applyPatch(delta, node);
                this._curInspector._rebuilding = false;
            }

            //
            this._queryNodeAfter( id, 100 );
        }
        else {
            this.inspect( type, id, node );
        }
    },

    'scene:reloading': function () {
        if ( this._curInspector && this._curInspector._type === 'node' ) {
            this.uninspect();
        }
    },

    'asset-db:assets-moved': function ( results ) {
        if ( this._selectType !== 'asset' )
            return;

        // refresh if we have selectID
        for ( var i = 0; i < results.length; ++i ) {
            if ( this._selectID === results[i].uuid ) {
                this.refresh();
                break;
            }
        }
    },

    'asset-db:asset-changed': function ( result ) {
        if ( this._curInspector && this._selectID === result.uuid ) {
            this.refresh();
        }
    },

    'asset-db:meta-saved': function ( result ) {
        if ( this._curInspector && this._selectID === result.uuid ) {
            this.refresh();
        }
    },

    _queryNodeAfter: function ( nodeID, timeout ) {
        if ( this._queryID ) {
            this.cancelAsync(this._queryID);
            this._queryID = null;
        }

        var id = this.async( function () {
            Editor.sendToPanel('scene.panel', 'scene:query-node', id, nodeID );
        }, timeout );
        this._queryID = id;
    },

    _inspectState: function ( state ) {
        switch (state) {
            case 'connecting': return 'fa fa-eye connecting';
            case 'inspecting': return 'fa fa-eye inspecting';
            case 'uninspect': return 'fa fa-eye-slash uninspect';
        }
        return 'fa fa-eye-slash uninspect';
    },

    _applyPatch: function ( delta, node ) {
        var curPath = 'target';
        for ( var p in delta ) {
            this._patchAt( curPath + '.' + p, delta[p] );
        }
    },

    _patchAt: function ( path, delta ) {
        var k;

        if ( Array.isArray(delta) ) {
            var lastValueIdx, obj, objPath, subPath;

            if ( path !== 'target.__mixins__' ) {
                lastValueIdx = path.lastIndexOf( '.value' );
                if ( lastValueIdx + 6 !== path.length ) {
                    objPath = path.substring(0, lastValueIdx + 6);
                    subPath = path.substring( lastValueIdx + 7 );
                    obj = {};
                    var cur = this._curInspector.get(objPath);
                    for ( k in cur ) {
                        obj[k] = cur[k];
                    }
                }
            }

            // new
            if ( delta.length === 1 ) {
                if ( obj ) {
                    obj[subPath] = delta[0];
                    this._curInspector.set( objPath, obj );
                }
                else {
                    this._curInspector.set( path, delta[0] );
                }
            }
            // change
            else if ( delta.length === 2 ) {
                if ( obj ) {
                    obj[subPath] = delta[1];
                    this._curInspector.set( objPath, obj );
                }
                else {
                    this._curInspector.set( path, delta[1] );
                }
            }
            // delete
            else if ( delta.length === 3 ) {
                if ( obj ) {
                    delete obj[subPath];
                    this._curInspector.set( objPath, obj );
                }
                else {
                    this._curInspector.set( path, undefined );
                }
            }
        }
        // array
        else if ( delta._t === 'a' ) {
            for ( k in delta ) {
                if ( k === '_t' ) {
                    continue;
                }

                var idx, innerDelta;

                if ( k[0] === '_' ) {
                    innerDelta = delta[k];
                    if ( Array.isArray(innerDelta) ) {
                        idx = parseInt(k.substring(1));

                        if ( innerDelta.length === 3 ) {
                            // move ( 3 is the magic number )
                            if ( innerDelta[2] === 3 ) {
                                // TODO: ??
                            }
                            // delete
                            else if ( innerDelta[2] === 0 ) {
                                this._curInspector.splice( path, idx, 1 );
                            }
                        }
                    }
                }
                // new inserted
                else {
                    innerDelta = delta[k];

                    if ( Array.isArray(innerDelta) ) {
                        // new
                        if ( innerDelta.length === 1 ) {
                            idx = parseInt(k);
                            this._curInspector.splice( path, idx, 0, innerDelta[0] );
                        }
                    }
                    // nested apply
                    else {
                        this._patchAt( path + '.' + k, delta[k] );
                    }
                }
            }
        }
        // object
        else {
            for ( k in delta ) {
                this._patchAt( path + '.' + k, delta[k] );
            }
        }
    },
});

})();
