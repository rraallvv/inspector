"use strict";

Editor.polymerElement({
	properties: {
		info: {
			type: String,
			value: "Unknown"
		},
		target: {
			type: Object,
			value: null
		},
		uuid: {
			type: String,
			value: "",
			observer: "_uuidChanged"
		},
		mtime: {
			type: Number,
			value: 0
		}
	},
	_getSize: function() {
		var t = 0,
			i = 0;
		return "texture" === this.target.__assetType__ ? (t = this._image.width, i = this._image.height) : "sprite-frame" === this.target.__assetType__ && (t = this.target.width, i = this.target.height), {
			width: t,
			height: i
		}
	},
	_uuidChanged: function() {
		var t = this;
		this.uuid && (this._image = new Image, this._image.onload = function() {
			var i = t._getSize();
			t.info = i.width + " x " + i.height, t.resize()
		}, this._image.src = "uuid://" + this.uuid + "?" + this.mtime)
	},
	resize: function() {
		var t = this.$.content.getBoundingClientRect(),
			i = this._getSize(),
			e = Editor.Utils.fitSize(i.width, i.height, t.width, t.height);
		this.target.rotated && (this._scalingSize = {
			width: Math.ceil(e[1]),
			height: Math.ceil(e[0])
		}), this.$.canvas.width = Math.ceil(e[0]), this.$.canvas.height = Math.ceil(e[1]), this.repaint()
	},
	repaint: function() {
		var t = this;
		if (this.target) {
			var i = this.$.canvas.getContext("2d");
			i.imageSmoothingEnabled = !1;
			var e = this.$.canvas.width,
				h = this.$.canvas.height;
			if ("texture" === this.target.__assetType__) i.drawImage(this._image, 0, 0, e, h), this.target.subMetas && this.target.subMetas.forEach(function(a) {
				var s = e / t._image.width,
					r = h / t._image.height;
				i.beginPath(), i.rect(a.trimX * s, a.trimY * r, a.width * s, a.height * r), i.lineWidth = 1, i.strokeStyle = "#ff00ff", i.stroke()
			});
			else if ("sprite-frame" === this.target.__assetType__) {
				var a = void 0,
					s = void 0,
					r = void 0,
					g = void 0;
				if (this.target.rotated) {
					var n = e / 2,
						d = h / 2;
					i.translate(n, d), i.rotate(-90 * Math.PI / 180), i.translate(-n, -d), a = e / 2 - this._scalingSize.width / 2, s = h / 2 - this._scalingSize.height / 2, r = this.target.height, g = this.target.width, e = this.$.canvas.height, h = this.$.canvas.width
				} else a = 0, s = 0, r = this.target.width, g = this.target.height, e = this.$.canvas.width, h = this.$.canvas.height;
				i.drawImage(this._image, this.target.trimX, this.target.trimY, r, g, a, s, e, h)
			}
		}
	}
});