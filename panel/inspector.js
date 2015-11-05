(function () {
    'use strict';

    var Path = require('fire-path');
    var DiffPatch = require('jsondiffpatch');
    var Utils = Editor.require('packages://inspector/utils/utils');

    var ARRAY_MOVE = 3;

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

    var _compare = {
        numerically: function(a, b) {
            return a - b;
        },
        numericallyBy: function(name) {
            return function(a, b) {
                return a[name] - b[name];
            };
        }
    };

    Editor.registerPanel( 'inspector.panel', {
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
            'prefab-select': '_onPrefabSelect',
            'prefab-revert': '_onPrefabRevert',
            'prefab-apply': '_onPrefabApply',
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

            var info = Editor.Selection.curGlobalActivate();
            if ( info ) {
                this.startInspect( info.type, info.id );
            }
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
                    this._loadMeta( id, function ( err, assetType, meta ) {
                        if ( err ) {
                            Editor.error( 'Failed to load meta %s, Message: %s', id, err.stack);
                            return;
                        }
                        this.inspect( assetType, meta.uuid, meta );
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
                if ( err ) {
                    return Editor.error(err);
                }
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
                        element.addEventListener( 'target-changed', function () {
                            if ( element._rebuilding )
                                return;

                            element.dirty = true;
                        });
                    }
                    else if ( this._selectType === 'node' ) {
                        element.addEventListener( 'new-prop', function ( event ) {
                            if ( element._rebuilding )
                                return;

                            element.dirty = true;

                            var path = event.detail.path;
                            var type = event.detail.type;
                            var mixinType = null;

                            var mixinProp = this._curInspector.get(Utils.mixinPath(path));
                            if ( mixinProp ) {
                                mixinType = mixinProp.__type__;
                            }

                            Editor.sendToPanel('scene.panel', 'scene:node-new-property', {
                                id: id,
                                path: Utils.normalizePath(path),
                                type: type,
                                mixinType: mixinType,
                            });
                            this._queryNodeAfter( id, 100 );
                        }.bind(this));

                        element.addEventListener( 'target-changed', function ( event ) {
                            if ( element._rebuilding )
                                return;

                            element.dirty = true;

                            var path = event.detail.path;
                            var prop = this._curInspector.get(event.detail.path);

                            var idx;
                            while ( prop !== undefined && !prop.attrs ) {
                                idx = path.lastIndexOf('.');
                                path = path.substring(0,idx);
                                prop = this._curInspector.get(path);
                            }
                            var subPath = Utils.stripValueInPath(event.detail.path.substring(idx));
                            path = prop.path + subPath;

                            var mixinType = null;
                            var mixinProp = this._curInspector.get(Utils.mixinPath(path));
                            if ( mixinProp ) {
                                mixinType = mixinProp.__type__;
                            }

                            Editor.sendToPanel('scene.panel', 'scene:node-set-property', {
                                id: id,
                                path: Utils.normalizePath(path),
                                type: prop.type,
                                value: event.detail.value,
                                mixinType: mixinType,
                            });
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

        showLoaderAfter: function ( timeout ) {
            if ( this.$.loader.hidden === false )
                return;

            if ( this._loaderID )
                return;

            this._loaderID = this.async( function () {
                this.$.loader.hidden = false;
                this._loaderID = null;
            }, timeout);
        },

        hideLoader: function () {
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
                if ( cb ) cb ( new Error ( `Can not find inspector for type ${type}` ) );
                return;
            }

            // EXAMPLE 1: cc.Texture2D ==> fire-texture
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
                var assetType = jsonObj['asset-type'];
                var metaCtor = Editor.metas[assetType];
                if ( !metaCtor ) {
                    if ( cb ) cb ( new Error('Can not find meta by type ' + assetType) );
                    return;
                }

                var meta = new metaCtor();
                meta.deserialize(jsonObj);
                meta.__name__ = Path.basenameNoExt(info.assetPath);
                meta.__path__ = info.assetPath;
                meta.__mtime__ = info.assetMtime;

                if ( cb ) cb ( null, assetType, meta );
            }.bind(this));
        },

        _onMetaRevert: function ( event ) {
            event.stopPropagation();

            var id = event.detail.uuid;

            //
            this._loadMeta( id, function ( err, assetType, meta ) {
                if ( err ) {
                    Editor.error( 'Failed to load meta %s, Message: %s', id, err.stack);
                    return;
                }
                this.inspect( assetType, meta.uuid, meta );
            }.bind(this));
        },

        _onMetaApply: function ( event ) {
            event.stopPropagation();

            var uuid = this._curInspector.target.uuid;
            var jsonString = JSON.stringify(this._curInspector.target);

            Editor.assetdb.saveMeta( uuid, jsonString );
        },

        _onPrefabSelect: function ( event ) {
            event.stopPropagation();

            var prefabUuid = this._curInspector.target.__prefab__.uuid;
            Editor.sendToAll('assets:hint', prefabUuid);
        },

        _onPrefabRevert: function ( event ) {
            event.stopPropagation();

            Editor.sendToPanel('scene.panel', 'scene:revert-prefab',
                               this._curInspector.target.uuid
                              );
        },

        _onPrefabApply: function ( event ) {
            event.stopPropagation();

            Editor.sendToPanel('scene.panel', 'scene:apply-prefab',
                               this._curInspector.target.uuid
                              );
        },

        _onNodeUnmixin: function ( event ) {
            event.stopPropagation();

            Editor.sendToPanel('scene.panel', 'scene:component-remove',
                               this._selectID,
                               event.detail.className
                              );
            // FIXME, HACK
            var selectType = this._selectType;
            var selectID = this._selectID;
            this.uninspect();
            this.startInspect( selectType, selectID );
        },

        _onResize: function () {
            if ( this._curInspector && this._curInspector.resize )
                this._curInspector.resize();
        },

        _onPanelShow: function () {
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
                var assetType = info.type;
                if ( assetType === 'javascript' ||
                     assetType === 'coffeescript'
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
            Editor.sendToPanel('scene.panel', 'scene:component-add',
                               this._selectID,
                               uuid
                              );
        },

        'selection:activated': function ( type, id ) {
            this.startInspect( type, id, 100 );
        },

        'scene:reply-query-node': function ( queryID, nodeInfo ) {
            nodeInfo = JSON.parse(nodeInfo);

            var node = nodeInfo.value;
            if ( !node )
                return;

            var id = node.uuid;
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
            Utils.buildNode( node, clsList, 'target', false );

            // if current inspector is node-inspector and have the same id
            if ( this._curInspector &&
                 this._curInspector._type === 'node' &&
                 this._curInspector.target.uuid === id
               )
            {
                var delta = _diffpatcher.diff( this._curInspector.target, node );
                if ( delta ) {
                    this._curInspector._rebuilding = true;
                    this._applyPatch(delta);
                    this._curInspector._rebuilding = false;
                }

                //
                this._queryNodeAfter( id, 100 );
            }
            else {
                this.inspect( node.__type__, id, node );
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

        'asset-db:asset-uuid-changed': function ( result ) {
            if ( this._curInspector && this._selectID === result.oldUuid ) {
                this._selectID = result.uuid;
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

        _applyPatch: function ( delta ) {
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
                    if ( lastValueIdx !== -1 && lastValueIdx + 6 !== path.length ) {
                        objPath = path.substring(0, lastValueIdx + 6);
                        subPath = path.substring( lastValueIdx + 7 );
                        var cur = this._curInspector.get(objPath);

                        // only object needs check subPath
                        if ( typeof cur === 'object' && !Array.isArray(cur) ) {
                            obj = {};
                            for ( k in cur ) {
                                obj[k] = cur[k];
                            }
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
                var toRemove = [];
                var toInsert = [];
                var toModify = [];

                for ( k in delta ) {
                    if ( k === '_t' ) {
                        continue;
                    }

                    var innerDelta;
                    innerDelta = delta[k];

                    if ( k[0] === '_' ) {
                        // removed item from original array
                        if (innerDelta[2] === 0 || innerDelta[2] === ARRAY_MOVE) {
                            toRemove.push(parseInt(k.slice(1), 10));
                        }
                    } else {
                        if (innerDelta.length === 1) {
                            // added item at new array
                            toInsert.push({
                                index: parseInt(k, 10),
                                value: innerDelta[0],
                            });
                        } else {
                            // modified item at new array
                            toModify.push({
                                index: parseInt(k, 10),
                                delta: innerDelta,
                            });
                        }
                    }
                }

                // remove items, in reverse order to avoid sawing our own floor
                toRemove = toRemove.sort(_compare.numerically);
                for (k = toRemove.length - 1; k >= 0; k--) {
                    var index1 = toRemove[k];
                    var indexDiff = delta['_' + index1];
                    var removedValue = this._curInspector.splice(path, index1, 1)[0];
                    if (indexDiff[2] === ARRAY_MOVE) {
                        // reinsert later
                        toInsert.push({
                            index: indexDiff[1],
                            value: removedValue
                        });
                    }
                }

                // insert items, in reverse order to avoid moving our own floor
                toInsert = toInsert.sort(_compare.numericallyBy('index'));
                for (k = 0; k < toInsert.length; k++) {
                    var insertion = toInsert[k];
                    this._curInspector.splice(path, insertion.index, 0, insertion.value);
                }

                // apply modifications
                if (toModify.length > 0) {
                    for (k = 0; k < toModify.length; k++) {
                        var modification = toModify[k];
                        this._patchAt( path + '.' + modification.index, modification.delta );
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
