"use strict";

function _getValType(e, t) {
	var r = void 0;
	if (null !== e && void 0 !== e)
		if (r = typeof e, "object" === r) {
			r = e.__type__ ? e.__type__ : t.type;
			var _ = t.type;
			_ || (_ = r), Array.isArray(e) ? r = "Array" : Editor.properties && !Editor.properties[_] && (!t.attrsExtends || -1 === t.attrsExtends.indexOf("cc.Node") && -1 === t.attrsExtends.indexOf("cc.Component") && -1 === t.attrsExtends.indexOf("cc.RawAsset")) && (r = cc.js._getClassById(t.type) ? "Object" : "error-unknown")
		} else r = r.charAt(0).toUpperCase() + r.slice(1);
	else r = t.type;
	return r
}

function _buildProp(e, t, r, _, a, p, i) {
	var o = _[t];
	if (o && "__type__" !== r && "__comps__" !== r) {
		var n = e[r];
		if (!i && o.properties && (i = o.properties[r]), i && i.visible !== !1 && (!Array.isArray(n) || i.type) && i.visible !== !1) {
			var s = _[i.type];
			s && (i.typename = s.name, s["extends"] && (i.attrsExtends = s["extends"].slice()));
			var l = _getValType(n, i);
			n && n.__type__ && delete n.__type__;
			var d = _[l];
			d && d["extends"] && (i["extends"] = d["extends"].slice()), a = a + "." + r;
			var c = r;
			i && i.displayName && (c = i.displayName);
			var y = {
				name: c,
				path: a,
				value: n,
				type: l ? l : "",
				attrs: i
			};
			if (p ? (e.__props__ || (e.__props__ = []), e.__props__.push(y), delete e[r]) : e[r] = y, "Array" === l)
				for (var u = 0; u < n.length; ++u) {
					var v = n[u],
						f = _getValType(v, i);
					v && v.__type__ && delete v.__type__;
					var m = !1;
					if (v && "object" == typeof v && (m = !0), m) {
						var h = {};
						for (var x in i) h[x] = i[x];
						_buildProp(n, h.type, u, _, a, !1, h), n[u].name = "[" + u + "]"
					} else n[u] = {
						name: "[" + u + "]",
						path: a + "." + u,
						value: v,
						type: f,
						attrs: {
							type: i.type
						}
					}
				} else if ("Object" === l)
					for (var P in n) _buildProp(n, i.type, P, _, a, !0);
				else {
					var m = !o["extends"] || -1 === o["extends"].lastIndexOf("cc.ValueType");
					if (m)
						for (var P in n) _buildProp(n, i.type, P, _, a, !1)
				}
		}
	}
}

function normalizePath(e) {
	return e = e.replace(/^target\./, ""), e = e.replace(/^__comps__\.#{0,1}\d+\./, "")
}

function isCompPath(e) {
	return _compReg.test(e)
}

function compPath(e) {
	var t = _compReg.exec(e);
	return t ? t[0] : ""
}

function stripValueInPath(e) {
	for (var t = e.split("."), r = [], _ = 0; _ < t.length; ++_) {
		var a = t[_];
		_ % 2 === 0 && r.push(a)
	}
	return r.join(".")
}
var buildNode = function e(t, r, _, a) {
		var p = t.__type__;
		if (!p) return void Editor.warn("Type can not be null");
		var i = r[p];
		i && (i.editor && (t.__editor__ = i.editor), i.name && (t.__displayName__ = i.name));
		for (var o in t)
			if ("__type__" !== o)
				if ("__comps__" !== o) t.__editor__ && t.__editor__.inspector && (a = !1), _buildProp(t, p, o, r, _, a);
				else
					for (var n = t[o], s = 0; s < n.length; ++s) e(n[s], r, _ + ".__comps__." + s, !0)
	},
	_compReg = /^target\.__comps__\.#{0,1}\d+/;
module.exports = {
	buildNode: buildNode,
	isCompPath: isCompPath,
	compPath: compPath,
	normalizePath: normalizePath,
	stripValueInPath: stripValueInPath
};