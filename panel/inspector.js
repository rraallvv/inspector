(() => {
  'use strict';

  const Path = require('fire-path');
  const DiffPatch = require('jsondiffpatch');
  const Utils = Editor.require('packages://inspector/utils/utils');

  let ARRAY_MOVE = 3;

  let _url2imported = {};
  let _diffpatcher = DiffPatch.create({
    // objcectHash: function ( obj, index ) {
    //     // try to find an id property, otherwise just use the index in the array
    //     return obj.__type__ || '$$index:' + index;
    // },
    arrays: {
      detectMove: true
    }
  });

  let _compare = {
    numerically (a, b) {
      return a - b;
    },
    numericallyBy (name) {
      return (a, b) => {
        return a[name] - b[name];
      };
    }
  };

  Editor.registerPanel('inspector.panel', {
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
      'remove-comp': '_onRemoveComp',
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

    ready () {
      this._initDroppable(this);

      this.reset();

      let info = Editor.Selection.curGlobalActivate();
      if ( info ) {
        this.startInspect( info.type, info.id );
      }
    },

    reset () {
      this._curInspector = null;
      this._inspectType = '';
      this._selectID = '';
      this._selectType = '';

      this.hideLoader();
    },

    refresh () {
      this.startInspect( this._selectType, this._selectID );
    },

    startInspect ( type, id, timeout ) {
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
      this._inspectID = this.async(() => {
        //
        if ( type === 'asset' ) {
          this._loadMeta( id, ( err, assetType, meta ) => {
            if ( err ) {
              Editor.error( 'Failed to load meta %s, Message: %s', id, err.stack);
              return;
            }
            this.inspect( assetType, meta.uuid, meta );
          });

          return;
        }

        //
        if ( type === 'node' ) {
          this._queryNodeAfter( id, 0 );
          return;
        }
      }, timeout);
    },

    inspect ( type, id, obj ) {
      this._inspectType = type;
      this._loadInspector (type, ( err, element ) => {
        if ( err ) {
          return Editor.error(err);
        }

        if ( this._selectID !== id ) {
          return;
        }

        this._removeContent();

        if ( element ) {
          element.dirty = false;
          element.target = obj;
          element._rebuilding = false;
          element._type = this._selectType;

          // observe changes
          if ( this._selectType === 'asset' ) {
            element.addEventListener( 'target-changed', () => {
              if ( element._rebuilding ) {
                return;
              }

              element.dirty = true;
            });
          } else if ( this._selectType === 'node' ) {
            element.addEventListener( 'new-prop', event => {
              if ( element._rebuilding ) {
                return;
              }

              element.dirty = true;

              let path = event.detail.path;
              let type = event.detail.type;

              let compProp = this._curInspector.get(Utils.compPath(path));

              Editor.sendToPanel('scene.panel', 'scene:new-property', {
                id: compProp ? compProp.uuid : id,
                path: Utils.normalizePath(path),
                type: type,
              });
              this._queryNodeAfter( id, 100 );
            });

            element.addEventListener( 'reset-prop', event => {
              if ( element._rebuilding ) {
                return;
              }

              element.dirty = true;

              let path = event.detail.path;
              let type = event.detail.type;

              let compProp = this._curInspector.get(Utils.compPath(path));

              Editor.sendToPanel('scene.panel', 'scene:reset-property', {
                id: compProp ? compProp.uuid : id,
                path: Utils.normalizePath(path),
                type: type,
              });
              this._queryNodeAfter( id, 100 );
            });

            element.addEventListener('array-size-changed', event => {
              if ( element._rebuilding ) {
                return;
              }

              element.dirty = true;
              let path = event.detail.path;

              let compProp = this._curInspector.get(Utils.compPath(path));
              let instID = compProp ? compProp.uuid : id;
              let info = {
                id: instID,
                path: Utils.normalizePath(path),
                type: 'number',
                value: event.detail.arraySize,
              };
              Editor.sendToPanel('scene.panel', 'scene:set-property', info);
              this._queryNodeAfter( id, 100 );
            });

            element.addEventListener('target-changed', event => {
              if ( element._rebuilding ) {
                return;
              }

              element.dirty = true;

              let path = event.detail.path;
              let prop = this._curInspector.get(event.detail.path);

              // if this is a enabled property
              let _enabledReg = /^target\.__comps__\.\#\d+\.enabled/;
              if ( _enabledReg.test(path) ) {
                let compProp = this._curInspector.get(Utils.compPath(path));
                let instID = compProp ? compProp.uuid : id;
                Editor.sendToPanel('scene.panel', 'scene:set-property', {
                  id: instID,
                  path: Utils.normalizePath(path),
                  type: 'boolean',
                  value: event.detail.value,
                });
                return;
              }

              let idx;
              while ( prop === undefined || !prop.attrs ) {
                idx = path.lastIndexOf('.');
                path = path.substring(0,idx);
                prop = this._curInspector.get(path);

                if ( idx === -1 ) {
                  break;
                }
              }

              if ( prop ) {
                let subPath = Utils.stripValueInPath(event.detail.path.substring(idx));
                path = prop.path + subPath;

                let compProp = this._curInspector.get(Utils.compPath(path));
                let instID = compProp ? compProp.uuid : id;
                let info = {
                  id: instID,
                  path: Utils.normalizePath(path),
                  type: prop.attrs.type,
                  value: event.detail.value,
                };
                Editor.sendToPanel('scene.panel', 'scene:set-property', info);
                this._queryNodeAfter( id, 100 );
              } else {
                Editor.failed(`Failed to set property ${path}, property not found!`);
              }
            });

            element.addEventListener('end-editing', event => {
              if ( event.detail.cancel ) {
                Editor.sendToPanel('scene.panel', 'scene:undo-cancel');
                return;
              }

              Editor.sendToPanel('scene.panel', 'scene:undo-commit');
            });

            this._queryNodeAfter( id, 100 );
          }

          let contentDOM = Polymer.dom(this.$.content);
          contentDOM.appendChild(element);

          //
          this._curInspector = element;
          this._setInspectState('inspecting');
          this.hideLoader();
        }
      });
    },

    uninspect () {
      this.reset();
      this._removeContent();
      this._setInspectState('uninspect');
    },

    showLoaderAfter ( timeout ) {
      if ( this.$.loader.hidden === false ) {
        return;
      }

      if ( this._loaderID ) {
        return;
      }

      this._loaderID = this.async(() => {
        this.$.loader.hidden = false;
        this._loaderID = null;
      }, timeout);
    },

    hideLoader () {
      this.cancelAsync(this._loaderID);
      this._loaderID = null;
      this.$.loader.hidden = true;
    },

    _checkIfApply () {
      if (
        this._selectType === 'asset' &&
        this._curInspector &&
        this._curInspector &&
        this._curInspector.dirty
      ) {
        let meta = this._curInspector.target;
        let result = Editor.Dialog.messageBox({
          type: 'warning',
          buttons: ['Apply', 'Revert'],
          title: 'Warning',
          message: 'Unapplied import settings',
          detail: `Unapplied import settings for '${meta.__url__}'`
        });

        if ( result === 0 ) {
          this.fire('meta-apply');
        } else {
          this.fire('meta-revert', { uuid: meta.uuid });
        }
      }
    },

    _removeContent () {
      var contentDOM = Polymer.dom(this.$.content);
      if ( contentDOM.children.length > 0 ) {
        contentDOM.removeChild( contentDOM.children[0] );
      }
    },

    _loadInspector ( type, cb ) {
      var url = Editor.inspectors[type];
      if ( url === undefined ) {
        if ( cb ) {
          cb ( new Error ( `Can not find inspector for type ${type}` ) );
        }
        return;
      }

      // EXAMPLE 1: cc.Texture2D ==> fire-texture
      // EXAMPLE 2: fooBar ==> foo-bar
      let prefix = type.replace(/([a-z][A-Z])/g, g => {
        return g[0] + '-' + g[1];
      });
      prefix = prefix.replace(/\./g, '-' ).toLowerCase();

      //
      if ( _url2imported[url] ) {
        let el = document.createElement( prefix + '-inspector');
        if ( cb ) {
          cb ( null, el );
        }
        return;
      }

      EditorUI.import( url, err => {
        if ( err ) {
          if ( cb ) cb ( err );
          return;
        }

        _url2imported[url] = true;
        let el = document.createElement( prefix + '-inspector');
        if ( cb ) {
          cb ( null, el );
        }
      });
    },

    _loadMeta ( id, cb ) {
      if ( id.indexOf('mount-') === 0 ) {
        if ( cb ) {
          cb ( null, 'mount', {
            __name__: id.substring(6),
            __path__: '',
            uuid: id,
          });
        }
        return;
      }

      Editor.assetdb.queryMetaInfoByUuid( id, info => {
        if ( !info ) {
          if ( cb ) {
            cb ( new Error(`Failed to query meta info by ${id}`) );
          }
          return;
        }

        //
        let meta = JSON.parse(info.json);
        meta.__assetType__ = info.assetType;
        meta.__name__ = Path.basenameNoExt(info.assetPath);
        meta.__path__ = info.assetPath;
        meta.__url__ = info.assetUrl;
        meta.__mtime__ = info.assetMtime;

        // map subMetas object to subMetas array
        if ( meta.subMetas ) {
          let subMetas = [];
          for ( let name in meta.subMetas ) {
            let subMeta = meta.subMetas[name];
            subMeta.__name__ = name;
            subMetas.push(subMeta);
          }

          meta.subMetas = subMetas;
        }

        if ( cb ) {
          cb ( null, info.defaultType, meta );
        }
      });
    },

    _onMetaRevert ( event ) {
      event.stopPropagation();

      let id = event.detail.uuid;

      //
      this._loadMeta( id, ( err, assetType, meta ) => {
        if ( err ) {
          Editor.error( 'Failed to load meta %s, Message: %s', id, err.stack);
          return;
        }
        this.inspect( assetType, meta.uuid, meta );
      });
    },

    _onMetaApply ( event ) {
      event.stopPropagation();

      let meta = this._curInspector.target;
      let uuid = meta.uuid;
      let subMetas = {};

      // map subMetas to table
      if ( meta.subMetas ) {
        meta.subMetas.forEach(meta => {
          subMetas[meta.__name__] = meta;
          delete meta.__name__;
        });
      }
      meta.subMetas = subMetas;

      let jsonString = JSON.stringify(meta);

      // NOTE: after serailize meta, we must go back to subMeta array
      let subMetasArray = [];
      for ( let name in meta.subMetas ) {
        let subMeta = meta.subMetas[name];
        subMeta.__name__ = name;
        subMetasArray.push(subMeta);
      }
      meta.subMetas = subMetasArray;

      Editor.assetdb.saveMeta( uuid, jsonString );
      this.showLoaderAfter(0);
    },

    _onPrefabSelect ( event ) {
      event.stopPropagation();

      let prefabUuid = this._curInspector.target.__prefab__.uuid;
      Editor.sendToAll('assets:hint', prefabUuid);
    },

    _onPrefabRevert ( event ) {
      event.stopPropagation();

      Editor.sendToPanel(
        'scene.panel',
        'scene:revert-prefab',
        this._curInspector.target.uuid
      );
    },

    _onPrefabApply ( event ) {
      event.stopPropagation();

      Editor.sendToPanel(
        'scene.panel',
        'scene:apply-prefab',
        this._curInspector.target.uuid
      );
    },

    _onRemoveComp ( event ) {
      event.stopPropagation();

      Editor.sendToPanel(
        'scene.panel',
        'scene:remove-component',
        this._selectID,
        event.detail.uuid
      );

      // FIXME, HACK
      let selectType = this._selectType;
      let selectID = this._selectID;
      this.uninspect();
      this.startInspect( selectType, selectID );
    },

    _onResize: function () {
      if ( this._curInspector && this._curInspector.resize ) {
        this._curInspector.resize();
      }
    },

    _onPanelShow: function () {
      if ( this._curInspector && this._curInspector.resize ) {
        this._curInspector.resize();
      }
    },

    // drag & drop

    _onDragOver: function ( event ) {
      let type = EditorUI.DragDrop.type(event.dataTransfer);
      if ( type !== 'asset' ) {
        return;
      }

      event.preventDefault();

      if (
        !this._curInspector ||
        this._curInspector._type !== 'node'
      ) {
        return;
      }

      //
      event.stopPropagation();

      //
      if ( this.dropAccepted ) {
        EditorUI.DragDrop.updateDropEffect(event.dataTransfer, 'copy');
      } else {
        EditorUI.DragDrop.updateDropEffect(event.dataTransfer, 'none');
      }
    },

    _onDropAreaEnter ( event ) {
      event.stopPropagation();

      if (
        !this._curInspector ||
        this._curInspector._type !== 'node'
      ) {
        return;
      }

      let dragItems = event.detail.dragItems;
      Editor.assetdb.queryInfoByUuid( dragItems[0], info => {
        let assetType = info.type;
        if (
          assetType === 'javascript' ||
          assetType === 'coffeescript'
        ) {
          this.dropAccepted = true;
          EditorUI.DragDrop.allowDrop( event.detail.dataTransfer, true );
        }
      });
    },

    _onDropAreaLeave ( event ) {
      event.stopPropagation();

      if (
        !this._curInspector ||
        this._curInspector._type !== 'node'
      ) {
        return;
      }

      this.dropAccepted = false;
    },

    _onDropAreaAccept ( event ) {
      event.stopPropagation();

      if (
        !this._curInspector ||
        this._curInspector._type !== 'node'
      )
      {
        return;
      }

      this.dropAccepted = false;
      Editor.Selection.cancel();

      //
      let dragItems = event.detail.dragItems;
      let uuid = dragItems[0];
      Editor.sendToPanel(
        'scene.panel',
        'scene:add-component',
        this._selectID,
        Editor.compressUuid(uuid)
      );
    },

    'selection:activated' ( type, id ) {
      this._checkIfApply();
      this.startInspect( type, id, 100 );
    },

    'scene:reply-query-node' ( queryID, nodeInfo ) {
      nodeInfo = JSON.parse(nodeInfo);

      let node = nodeInfo.value;
      if ( !node ) {
        return;
      }

      let id = node.uuid;
      let clsList = nodeInfo.types;

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
      if (
        this._curInspector &&
        this._curInspector._type === 'node' &&
        this._curInspector.target.uuid === id
      ) {
        let delta = _diffpatcher.diff( this._curInspector.target, node );
        if ( delta ) {
          this._curInspector._rebuilding = true;
          this._applyPatch(delta);
          this._curInspector._rebuilding = false;
        }

        //
        this.hideLoader();
        this._queryNodeAfter( id, 100 );
      } else {
        this.inspect( node.__type__, id, node );
      }
    },

    'scene:reloading' () {
      if ( this._curInspector && this._curInspector._type === 'node' ) {
        this.uninspect();
      }
    },

    'asset-db:assets-moved' ( results ) {
      if ( this._selectType !== 'asset' ) {
        return;
      }

      // refresh if we have selectID
      for ( let i = 0; i < results.length; ++i ) {
        if ( this._selectID === results[i].uuid ) {
          this.refresh();
          break;
        }
      }
    },

    'asset-db:asset-changed' ( result ) {
      if ( this._curInspector && this._selectID === result.uuid ) {
        this.refresh();
        return;
      }

      if ( this._selectType === 'asset' && this._curInspector.target ) {
        let meta = this._curInspector.target;
        if ( meta.subMetas.some( meta => { return meta.uuid === result.uuid; } ) ) {
          this.refresh();
          return;
        }
      }
    },

    'asset-db:asset-uuid-changed' ( result ) {
      if ( this._curInspector && this._selectID === result.oldUuid ) {
        this._selectID = result.uuid;
        this.refresh();
      }
    },

    _queryNodeAfter ( nodeID, timeout ) {
      if ( this._queryID ) {
        this.cancelAsync(this._queryID);
        this._queryID = null;
      }

      let id = this.async(() => {
        Editor.sendToPanel('scene.panel', 'scene:query-node', id, nodeID );
      }, timeout );
      this._queryID = id;
    },

    _inspectState ( state ) {
      switch (state) {
        case 'connecting': return 'fa fa-eye connecting';
        case 'inspecting': return 'fa fa-eye inspecting';
        case 'uninspect': return 'fa fa-eye-slash uninspect';
      }
      return 'fa fa-eye-slash uninspect';
    },

    _applyPatch ( delta ) {
      let curPath = 'target';
      for ( let p in delta ) {
        this._patchAt( curPath + '.' + p, delta[p] );
      }
    },

    _patchAt ( path, delta ) {
      if ( Array.isArray(delta) ) {
        let obj, objPath, subPath;

        if ( path !== 'target.__comps__' ) {
          let lastValueIdx = path.lastIndexOf( '.value' );
          if ( lastValueIdx !== -1 && lastValueIdx + 6 !== path.length ) {
            objPath = path.substring(0, lastValueIdx + 6);
            subPath = path.substring( lastValueIdx + 7 );
            let cur = this._curInspector.get(objPath);

            // only object needs check subPath
            if ( typeof cur === 'object' && !Array.isArray(cur) ) {
              obj = {};
              for ( let k in cur ) {
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
          } else {
            this._curInspector.set( path, delta[0] );
          }
        }
        // change
        else if ( delta.length === 2 ) {
          if ( obj ) {
            obj[subPath] = delta[1];
            this._curInspector.set( objPath, obj );
          } else {
            this._curInspector.set( path, delta[1] );
          }
        }
        // delete
        else if ( delta.length === 3 ) {
          if ( obj ) {
            delete obj[subPath];
            this._curInspector.set( objPath, obj );
          } else {
            this._curInspector.set( path, undefined );
          }
        }
      }
      // array
      else if ( delta._t === 'a' ) {
        let toRemove = [];
        let toInsert = [];
        let toModify = [];

        for ( let k in delta ) {
          if ( k === '_t' ) {
            continue;
          }

          let innerDelta;
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
        for (let k = toRemove.length - 1; k >= 0; k--) {
          let index1 = toRemove[k];
          let indexDiff = delta['_' + index1];
          let removedValue = this._curInspector.splice(path, index1, 1)[0];
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
        for (let k = 0; k < toInsert.length; k++) {
          let insertion = toInsert[k];
          this._curInspector.splice(path, insertion.index, 0, insertion.value);
        }

        // apply modifications
        if (toModify.length > 0) {
          for (let k = 0; k < toModify.length; k++) {
            let modification = toModify[k];
            this._patchAt( path + '.' + modification.index, modification.delta );
          }
        }
      }
      // object
      else {
        for ( let k in delta ) {
          this._patchAt( path + '.' + k, delta[k] );
        }
      }
    },
  });

})();
