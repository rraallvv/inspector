"use strict";

var Electron = require("electron")
    , BrowserWindow = Electron.BrowserWindow;

module.exports = {
	load: function() {
		Editor.Menu.register("node-inspector", function() {
			return [{
				label: "Reset Node",
				message: "scene:reset-node",
				panel: "scene",
				params: []
			}, {
				label: "Reset All",
				message: "scene:reset-all",
				panel: "scene",
				params: []
			}, {
				label: "Paste Component",
				message: "scene:paste-component",
				panel: "scene",
				params: []
			}]
		}, !0), Editor.Menu.register("component-inspector", function() {
			return [{
				label: "Remove",
				message: "scene:remove-component",
				panel: "scene",
				params: []
			}, {
				type: "separator"
			}, {
				label: "Reset",
				message: "scene:reset-component",
				panel: "scene",
				params: []
			}, {
				label: "Move Up",
				message: "scene:move-up-component",
				panel: "scene",
				params: []
			}, {
				label: "Move Down",
				message: "scene:move-down-component",
				panel: "scene",
				params: []
			}, {
				type: "separator"
			}, {
				label: "Copy Component",
				message: "scene:copy-component",
				panel: "scene",
				params: []
			}, {
				label: "Paste Component",
				message: "scene:paste-component",
				panel: "scene",
				params: []
			}]
		})
	},
	unload: function() {
		Editor.Menu.unregister("node-inspector"), Editor.Menu.unregister("component-inspector")
	},
	messages: {
		open: function() {
			Editor.Panel.open("inspector")
		},
		"popup-node-inspector-menu": function(e, n) {
			var o = Editor.Menu.getMenu("node-inspector");
			Editor.Menu.walk(o, function(e) {
				e.params && e.params.unshift(n.uuid), "scene:paste-component" === e.message && (e.enabled = n.hasCopyComp)
			});
			var s = new Editor.Menu(o, e.sender),
				a = Math.floor(n.x),
				t = Math.floor(n.y);
			s.nativeMenu.popup(BrowserWindow.fromWebContents(e.sender), a, t), s.dispose()
		},
		"popup-component-inspector-menu": function(e, n) {
			var o = Editor.Menu.getMenu("component-inspector");
			Editor.Menu.walk(o, function(e) {
				e.params && ("scene:paste-component" === e.message ? e.params.unshift(n.nodeUuid) : "scene:copy-component" === e.message ? e.params.unshift(n.compUuid) : e.params.unshift(n.nodeUuid, n.compUuid)), "scene:move-up-component" === e.message ? e.enabled = n.compIndex - 1 >= 0 : "scene:move-down-component" === e.message ? e.enabled = n.compIndex + 1 < n.compCount : "scene:paste-component" === e.message && (e.enabled = n.hasCopyComp)
			});
			var s = new Editor.Menu(o, e.sender),
				a = Math.floor(n.x),
				t = Math.floor(n.y);
			s.nativeMenu.popup(BrowserWindow.fromWebContents(e.sender), a, t), s.dispose()
		},
		"popup-comp-menu": function(e, n, o, s) {
			var a = Editor.Menu.getMenu("add-component");
			Editor.Menu.walk(a, function(e) {
				e.params && e.params.unshift(s)
			});
			var t = new Editor.Menu(a, e.sender);
			n = Math.floor(n), o = Math.floor(o), t.nativeMenu.popup(BrowserWindow.fromWebContents(e.sender), n, o), t.dispose()
		}
	}
};

