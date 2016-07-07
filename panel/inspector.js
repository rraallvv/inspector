"use strict";
! function() {
	var e = require("fire-path"),
		t = require("jsondiffpatch"),
		r = Editor.require("packages://inspector/utils/utils"),
		n = 3,
		s = {},
		i = t.create({
			objectHash: function(e, t) {
				return e ? e.uuid ? e.uuid : e.name && e.attrs ? e.name : "$$index:" + t : -1
			},
			arrays: {
				detectMove: !0
			}
		}),
		o = {
			numerically: function(e, t) {
				return e - t
			},
			numericallyBy: function(e) {
				return function(t, r) {
					return t[e] - r[e]
				}
			}
		};
	Editor.polymerPanel("inspector", {
		behaviors: [Editor.UI.Droppable],
		hostAttributes: {
			droppable: "asset",
			"single-drop": !0
		},
		listeners: {
			"panel-resize": "_onResize",
			"panel-show": "_onPanelShow",
			dragover: "_onDragOver",
			"drop-area-enter": "_onDropAreaEnter",
			"drop-area-leave": "_onDropAreaLeave",
			"drop-area-accept": "_onDropAreaAccept",
			"meta-revert": "_onMetaRevert",
			"meta-apply": "_onMetaApply",
			"prefab-select": "_onPrefabSelect",
			"prefab-revert": "_onPrefabRevert",
			"prefab-apply": "_onPrefabApply",
			"remove-comp": "_onRemoveComp",
			"show-node-inspector-menu": "_onShowNodeInspectorMenu",
			"show-comp-inspector-menu": "_onShowComponentInspectorMenu",
			"search-asset": "_onSendSearchAssetEvent",
			"filter-node": "_onSendFilterNodeEvent"
		},
		properties: {
			dropAccepted: {
				type: Boolean,
				value: !1
			},
			inspectState: {
				type: String,
				value: "uninspect",
				readOnly: !0
			}
		},
		ready: function() {
			this._initDroppable(this), this.reset()
		},
		"panel-ready": function() {
			var e = this;
			Editor.Ipc.sendToPanel("scene", "scene:is-ready", function(t, r) {
				if (r) {
					var n = Editor.Selection.curGlobalActivate();
					n && e.startInspect(n.type, n.id)
				}
			}, -1)
		},
		reset: function() {
			this._searchAssetDom = null, Editor.Ipc.sendToAll("assets:clearSearch"), this._filterNodeDom = null, Editor.Ipc.sendToAll("hierarchy:clearFilter"), this._curInspector = null, this._inspectType = "", this._selectID = "", this._selectType = "", this.hideLoader()
		},
		refresh: function() {
			this.startInspect(this._selectType, this._selectID)
		},
		startInspect: function(e, t, r) {
			var n = this;
			return "number" != typeof r && (r = 0), t ? (this._setInspectState("connecting"), this.showLoaderAfter(200), this._selectType = e, this._selectID = t, this.cancelAsync(this._inspectID), void(this._inspectID = this.async(function() {
				return "asset" === e ? (n._searchAssetDom = null, Editor.Ipc.sendToAll("assets:clearSearch"), void n._loadMeta(t, function(e, r, s) {
					return e ? void Editor.error("Failed to load meta %s, Message: %s", t, e.stack) : void n.inspect(r, s.uuid, s)
				})) : "node" === e ? (n._filterNodeDom = null, Editor.Ipc.sendToAll("hierarchy:clearFilter"), void n._queryNodeAfter(t, 0)) : void 0
			}, r))) : void(this._selectType === e && this.uninspect())
		},
		inspect: function(e, t, n) {
			var s = this;
			this._inspectType = e, this._loadInspector(e, function(e, i) {
				if (e) return Editor.error(e);
				if (s._selectID === t && (s._removeContent(), i)) {
					i.dirty = !1, i.target = n, i._rebuilding = !1, i._type = s._selectType, "asset" === s._selectType ? i.addEventListener("target-changed", function() {
						i._rebuilding || (i.dirty = !0)
					}) : "node" === s._selectType && (i.addEventListener("new-prop", function(e) {
						if (!i._rebuilding) {
							i.dirty = !0;
							var n = e.detail.path,
								o = e.detail.type,
								a = s._curInspector.get(r.compPath(n));
							Editor.Ipc.sendToPanel("scene", "scene:new-property", {
								id: a ? a.uuid : t,
								path: r.normalizePath(n),
								type: o
							}), s._queryNodeAfter(t, 100)
						}
					}), i.addEventListener("reset-prop", function(e) {
						if (!i._rebuilding) {
							i.dirty = !0;
							var n = e.detail.path,
								o = e.detail.type,
								a = s._curInspector.get(r.compPath(n));
							Editor.Ipc.sendToPanel("scene", "scene:reset-property", {
								id: a ? a.uuid : t,
								path: r.normalizePath(n),
								type: o
							}), s._queryNodeAfter(t, 100)
						}
					}), i.addEventListener("array-size-changed", function(e) {
						if (!i._rebuilding) {
							i.dirty = !0;
							var n = e.detail.path,
								o = s._curInspector.get(r.compPath(n)),
								a = o ? o.uuid : t,
								c = {
									id: a,
									path: r.normalizePath(n),
									type: "number",
									value: e.detail.arraySize,
									isSubProp: !1
								};
							Editor.Ipc.sendToPanel("scene", "scene:set-property", c), s._queryNodeAfter(t, 100)
						}
					}), i.addEventListener("target-changed", function(e) {
						if (!i._rebuilding) {
							i.dirty = !0;
							var n = e.detail.path,
								o = s._curInspector.get(e.detail.path),
								a = /^target\.__comps__\.\#\d+\.enabled/;
							if (a.test(n)) {
								var c = s._curInspector.get(r.compPath(n)),
									p = c ? c.uuid : t;
								return void Editor.Ipc.sendToPanel("scene", "scene:set-property", {
									id: p,
									path: r.normalizePath(n),
									type: "boolean",
									value: e.detail.value,
									isSubProp: !1
								})
							}
							for (var d = void 0;
								(void 0 === o || !o.attrs) && (d = n.lastIndexOf("."), n = n.substring(0, d), o = s._curInspector.get(n), -1 !== d););
							if (o) {
								var u = r.stripValueInPath(e.detail.path.substring(d));
								n = o.path + u;
								var c = s._curInspector.get(r.compPath(n)),
									p = c ? c.uuid : t,
									l = {
										id: p,
										path: r.normalizePath(n),
										type: o.attrs.type,
										value: e.detail.value,
										isSubProp: "" !== u
									};
								Editor.Ipc.sendToPanel("scene", "scene:set-property", l), s._queryNodeAfter(t, 100)
							} else Editor.failed("Failed to set property " + n + ", property not found!")
						}
					}), i.addEventListener("end-editing", function(e) {
						return e.detail.cancel ? void Editor.Ipc.sendToPanel("scene", "scene:undo-cancel") : void Editor.Ipc.sendToPanel("scene", "scene:undo-commit")
					}), s._queryNodeAfter(t, 100));
					var o = Polymer.dom(s.$.content);
					o.appendChild(i), s._curInspector = i, s._setInspectState("inspecting"), s.hideLoader()
				}
			})
		},
		uninspect: function() {
			this.reset(), this._removeContent(), this._setInspectState("uninspect")
		},
		showLoaderAfter: function(e) {
			var t = this;
			this.$.loader.hidden !== !1 && (this._loaderID || (this._loaderID = this.async(function() {
				t.$.loader.hidden = !1, t._loaderID = null
			}, e)))
		},
		hideLoader: function() {
			this.cancelAsync(this._loaderID), this._loaderID = null, this.$.loader.hidden = !0
		},
		_checkIfApply: function() {
			if ("asset" === this._selectType && this._curInspector && this._curInspector && this._curInspector.dirty) {
				var e = this._curInspector.target,
					t = Editor.Dialog.messageBox({
						type: "warning",
						buttons: [Editor.T("MESSAGE.apply"), Editor.T("MESSAGE.revert")],
						title: Editor.T("MESSAGE.warning"),
						message: Editor.T("MESSAGE.inspector.apply_import_setting_message"),
						detail: Editor.T("MESSAGE.inspector.apply_import_setting_detail", {
							url: e.__url__
						}),
						defaultId: 0,
						cancelId: 1,
						noLink: !0
					});
				0 === t ? this.fire("meta-apply") : this.fire("meta-revert", {
					uuid: e.uuid
				})
			}
		},
		_removeContent: function() {
			var e = Polymer.dom(this.$.content);
			e.children.length > 0 && e.removeChild(e.children[0])
		},
		_loadInspector: function(e, t) {
			var r = Editor.inspectors[e];
			if (void 0 === r) return void(t && t(new Error("Can not find inspector for type " + e)));
			var n = e.replace(/([a-z][A-Z])/g, function(e) {
				return e[0] + "-" + e[1]
			});
			if (n = n.replace(/\./g, "-").toLowerCase(), s[r]) {
				var i = document.createElement(n + "-inspector");
				return void(t && t(null, i))
			}
			Editor.UI.PolymerUtils["import"](r, function(e) {
				if (e) return void(t && t(e));
				s[r] = !0;
				var i = document.createElement(n + "-inspector");
				t && t(null, i)
			})
		},
		_loadMeta: function(t, r) {
			return 0 === t.indexOf("mount-") ? void(r && r(null, "mount", {
				__name__: t.substring(6),
				__path__: "",
				uuid: t
			})) : void Editor.assetdb.queryMetaInfoByUuid(t, function(n, s) {
				if (!s) return void(r && r(new Error("Failed to query meta info by " + t)));
				var i = JSON.parse(s.json);
				if (i.__assetType__ = s.assetType, i.__name__ = e.basenameNoExt(s.assetPath), i.__path__ = s.assetPath, i.__url__ = s.assetUrl, i.__mtime__ = s.assetMtime, i.subMetas) {
					var o = [];
					for (var a in i.subMetas) {
						var c = i.subMetas[a];
						c.__name__ = a, o.push(c)
					}
					i.subMetas = o
				}
				r && r(null, s.defaultType, i)
			})
		},
		_onMetaRevert: function(e) {
			var t = this;
			e.stopPropagation();
			var r = e.detail.uuid;
			this._loadMeta(r, function(e, n, s) {
				return e ? void Editor.error("Failed to load meta %s, Message: %s", r, e.stack) : void t.inspect(n, s.uuid, s)
			})
		},
		_onMetaApply: function(e) {
			e.stopPropagation();
			var t = this._curInspector.target,
				r = t.uuid,
				n = {};
			t.subMetas && t.subMetas.forEach(function(e) {
				n[e.__name__] = e, delete e.__name__
			}), t.subMetas = n;
			var s = JSON.stringify(t),
				i = [];
			for (var o in t.subMetas) {
				var a = t.subMetas[o];
				a.__name__ = o, i.push(a)
			}
			t.subMetas = i, Editor.assetdb.saveMeta(r, s), this.showLoaderAfter(0)
		},
		_onPrefabSelect: function(e) {
			e.stopPropagation();
			var t = this._curInspector.target.__prefab__.uuid;
			Editor.Ipc.sendToAll("assets:hint", t)
		},
		_onPrefabRevert: function(e) {
			e.stopPropagation(), Editor.Ipc.sendToPanel("scene", "scene:revert-prefab", this._curInspector.target.uuid)
		},
		_onPrefabApply: function(e) {
			e.stopPropagation(), Editor.Ipc.sendToPanel("scene", "scene:apply-prefab", this._curInspector.target.uuid)
		},
		_onRemoveComp: function(e) {
			e.stopPropagation(), Editor.Ipc.sendToPanel("scene", "scene:remove-component", this._selectID, e.detail.uuid)
		},
		_onShowNodeInspectorMenu: function(e) {
			e.stopPropagation(), Editor.Ipc.sendToPackage("inspector", "popup-node-inspector-menu", e.detail)
		},
		_onShowComponentInspectorMenu: function(e) {
			e.stopPropagation(), Editor.Ipc.sendToPackage("inspector", "popup-component-inspector-menu", e.detail)
		},
		_onResize: function() {
			this._curInspector && this._curInspector.resize && this._curInspector.resize()
		},
		_onPanelShow: function() {
			this._curInspector && this._curInspector.resize && this._curInspector.resize()
		},
		_onDragOver: function(e) {
			var t = Editor.UI.DragDrop.type(e.dataTransfer);
			"asset" === t && (e.preventDefault(), this._curInspector && "node" === this._curInspector._type && (e.stopPropagation(), this.dropAccepted ? Editor.UI.DragDrop.updateDropEffect(e.dataTransfer, "copy") : Editor.UI.DragDrop.updateDropEffect(e.dataTransfer, "none")))
		},
		_onDropAreaEnter: function(e) {
			var t = this;
			if (e.stopPropagation(), this._curInspector && "node" === this._curInspector._type) {
				var r = e.detail.dragItems;
				Editor.assetdb.queryInfoByUuid(r[0], function(r, n) {
					var s = n.type;
					"javascript" !== s && "coffeescript" !== s || (t.dropAccepted = !0, Editor.UI.DragDrop.allowDrop(e.detail.dataTransfer, !0))
				})
			}
		},
		_onDropAreaLeave: function(e) {
			e.stopPropagation(), this._curInspector && "node" === this._curInspector._type && (this.dropAccepted = !1)
		},
		_onDropAreaAccept: function(e) {
			if (e.stopPropagation(), this._curInspector && "node" === this._curInspector._type) {
				this.dropAccepted = !1, Editor.Selection.cancel();
				var t = e.detail.dragItems,
					r = t[0];
				Editor.Ipc.sendToPanel("scene", "scene:add-component", this._selectID, Editor.UuidUtils.compressUuid(r))
			}
		},
		messages: {
			"selection:activated": function(e, t, r) {
				this._checkIfApply(), this.startInspect(t, r, 100)
			},
			"scene:reply-query-node": function(e, t, n) {
				n = JSON.parse(n);
				var s = n.value;
				if (s) {
					var o = s.uuid,
						a = n.types;
					if (this._queryID === t && "node" === this._selectType && this._selectID === o)
						if (r.buildNode(s, a, "target", !1), this._curInspector && "node" === this._curInspector._type && this._curInspector.target.uuid === o) {
							var c = i.diff(this._curInspector.target, s);
							c && (this._curInspector._rebuilding = !0, this._applyPatch(c), this._curInspector._rebuilding = !1), this.hideLoader(), this._queryNodeAfter(o, 100)
						} else this.inspect(s.__type__, o, s)
				}
			},
			"scene:reloading": function() {
				this._curInspector && "node" === this._curInspector._type && this.uninspect()
			},
			"asset-db:assets-moved": function(e, t) {
				if ("asset" === this._selectType)
					for (var r = 0; r < t.length; ++r)
						if (this._selectID === t[r].uuid) {
							this.refresh();
							break
						}
			},
			"asset-db:asset-changed": function(e, t) {
				if (this._curInspector && this._selectID === t.uuid) return void this.refresh();
				if ("asset" === this._selectType && this._curInspector.target) {
					var r = this._curInspector.target;
					if (r.subMetas && r.subMetas.some(function(e) {
							return e.uuid === t.uuid
						})) return void this.refresh()
				}
			},
			"asset-db:asset-uuid-changed": function(e, t) {
				this._curInspector && this._selectID === t.oldUuid && (this._selectID = t.uuid, this.refresh())
			},
			"select-search-asset": function(e, t) {
				var r = this._searchAssetDom;
				r && t && r.set("value", t)
			},
			"select-filter-node": function(e, t) {
				var r = this._filterNodeDom;
				r && t && Editor.Ipc.sendToPanel("scene", "scene:query-node-info", t, r.typeid, function(e, n) {
					r._compID = r._cacheNodeID = n.nodeID, r._nodeID = r._cacheCompID = n.compID, "cc.Node" !== r.typeid ? (r.invalid = !n.compID, t = r._cacheCompID) : r.invalid = !1, r.set("value", t), t || (r._nodeName = "None", r._missed = !1), r.async(function() {
						r.fire("end-editing")
					}, 1)
				})
			},
			"editor:project-profile-updated": function(e, t) {
				if ("node" === this._selectType && this._curInspector) {
					var r = t["group-list"];
					this._curInspector.set("groupList", r)
				}
			}
		},
		_queryNodeAfter: function(e, t) {
			this._queryID && (this.cancelAsync(this._queryID), this._queryID = null);
			var r = this.async(function() {
				Editor.Ipc.sendToPanel("scene", "scene:query-node", r, e)
			}, t);
			this._queryID = r
		},
		_inspectState: function(e) {
			switch (e) {
				case "connecting":
					return "fa fa-eye connecting";
				case "inspecting":
					return "fa fa-eye inspecting";
				case "uninspect":
					return "fa fa-eye-slash uninspect"
			}
			return "fa fa-eye-slash uninspect"
		},
		_applyPatch: function(e) {
			var t = "target";
			for (var r in e) this._patchAt(t + "." + r, e[r])
		},
		_patchAt: function(e, t) {
			if (Array.isArray(t)) {
				var r = void 0,
					s = void 0,
					i = void 0;
				if ("target.__comps__" !== e) {
					var a = e.lastIndexOf(".value");
					if (-1 !== a && a + 6 !== e.length) {
						s = e.substring(0, a + 6), i = e.substring(a + 7);
						var c = this._curInspector.get(s);
						if ("object" == typeof c && !Array.isArray(c)) {
							r = {};
							for (var p in c) r[p] = c[p]
						}
					}
				}
				1 === t.length ? r ? (r[i] = t[0], this._curInspector.set(s, r)) : this._curInspector.set(e, t[0]) : 2 === t.length ? r ? (r[i] = t[1], this._curInspector.set(s, r)) : this._curInspector.set(e, t[1]) : 3 === t.length && (r ? (delete r[i], this._curInspector.set(s, r)) : this._curInspector.set(e, void 0))
			} else if ("a" === t._t) {
				var d = [],
					u = [],
					l = [];
				for (var p in t)
					if ("_t" !== p) {
						var _ = void 0;
						_ = t[p], "_" === p[0] ? 0 !== _[2] && _[2] !== n || d.push(parseInt(p.slice(1), 10)) : 1 === _.length ? u.push({
							index: parseInt(p, 10),
							value: _[0]
						}) : l.push({
							index: parseInt(p, 10),
							delta: _
						})
					}
				d = d.sort(o.numerically);
				for (var p = d.length - 1; p >= 0; p--) {
					var h = d[p],
						f = t["_" + h],
						v = this._curInspector.splice(e, h, 1)[0];
					f[2] === n && u.push({
						index: f[1],
						value: v
					})
				}
				u = u.sort(o.numericallyBy("index"));
				for (var p = 0; p < u.length; p++) {
					var I = u[p];
					this._curInspector.splice(e, I.index, 0, I.value)
				}
				if (l.length > 0)
					for (var p = 0; p < l.length; p++) {
						var y = l[p];
						this._patchAt(e + "." + y.index, y.delta)
					}
			} else
				for (var p in t) this._patchAt(e + "." + p, t[p])
		},
		_onSendSearchAssetEvent: function(e, t) {
			e.stopPropagation(), e.preventDefault(), this._searchAssetDom = t
		},
		_onSendFilterNodeEvent: function(e, t) {
			e.stopPropagation(), e.preventDefault(), this._filterNodeDom = t
		}
	})

}();