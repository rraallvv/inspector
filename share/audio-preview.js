"use strict";
Editor.polymerElement({
	properties: {
		audioInfo: {
			type: String,
			value: ""
		},
		timeInfo: {
			type: String,
			value: ""
		},
		state: {
			type: String,
			value: "stopped"
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
	_uuidChanged: function() {
		var t = this;
		if (this.uuid) {
			this._audioCtrl = null;
			var i = "uuid://" + this.uuid + "?" + this.mtime;
			this.showLoaderAfter(100), Editor.Audio.load(i, function(i, e) {
				return t.hideLoader(), i ? void Editor.error("Failed to decoding audio data: " + i.message) : (e.on("started", function() {
					t.state = t._audioCtrl.state(), t._tickProgress()
				}), e.on("ended", function() {
					t.state = t._audioCtrl.state()
				}), e.on("paused", function() {
					t.state = t._audioCtrl.state()
				}), t._audioCtrl = e, t._updateAudioInfo(), t.setProgress(0), void t.resize())
			})
		}
	},
	detached: function() {
		this._audioCtrl && this._audioCtrl.stop()
	},
	_playIconClass: function(t) {
		return "playing" === t ? "fa fa-pause" : "fa fa-play"
	},
	_onPlayOrPause: function() {
		this._audioCtrl && ("playing" === this.state ? this._audioCtrl.pause() : this._audioCtrl.resume())
	},
	_onReplay: function() {
		this._audioCtrl && this._audioCtrl.play()
	},
	_onStop: function() {
		this._audioCtrl && this._audioCtrl.stop()
	},
	_onMouseDown: function(t) {
		var i = this;
		if (t.stopPropagation(), 1 === t.which) {
			var e;
			! function() {
				e = i.$.content.getBoundingClientRect();
				var a = e.left,
					n = t.clientX - a;
				n = Editor.Math.clamp(n, 0, i._contentRectWidth);
				var o = n / i._contentRectWidth,
					r = i._audioCtrl.buffer().duration;
				"playing" === i.state ? i._audioCtrl.play(o * r) : i.setProgress(o), Editor.UI.DomUtils.startDrag("ew-resize", t, function(t) {
					var e = t.clientX - a;
					e = Editor.Math.clamp(e, 0, i._contentRectWidth);
					var n = e / i._contentRectWidth,
						o = i._audioCtrl.buffer().duration;
					"playing" === i.state ? i._audioCtrl.play(n * o) : i.setProgress(n)
				}, function(t) {
					if ("playing" !== i.state) {
						var e = t.clientX - a;
						e = Editor.Math.clamp(e, 0, i._contentRectWidth);
						var n = e / i._contentRectWidth,
							o = i._audioCtrl.buffer().duration;
						i._audioCtrl.play(n * o)
					}
				})
			}()
		}
	},
	resize: function() {
		var t = this.$.content.getBoundingClientRect();
		Editor.isRetina ? (this.$.canvas.width = 2 * t.width, this.$.canvas.height = 2 * t.height) : (this.$.canvas.width = t.width, this.$.canvas.height = t.height), this.$.canvas.style.width = t.width + "px", this.$.canvas.style.height = t.height + "px", this._contentRectWidth = t.width, this.repaint()
	},
	_updateAudioInfo: function() {
		var t = this._audioCtrl.buffer();
		this.audioInfo = "ch:" + t.numberOfChannels + ", " + t.sampleRate + "Hz"
	},
	_updateTimeInfo: function(t) {
		var i = this._audioCtrl.buffer().duration,
			e = new Date(t * i * 1e3),
			a = Editor.Utils.padLeft(e.getMinutes(), 2, "0"),
			n = Editor.Utils.padLeft(e.getSeconds(), 2, "0"),
			o = Editor.Utils.padLeft(e.getMilliseconds(), 3, "0");
		this.timeInfo = a + ":" + n + "." + o
	},
	setProgress: function(t) {
		var i = Math.floor(t * this._contentRectWidth);
		this.$.progressBar.hidden = !1, this.$.progressBar.style.transform = "translateX(" + i + "px)", this._updateTimeInfo(t)
	},
	repaint: function() {
		if (this._audioCtrl) {
			var t = this.$.canvas.getContext("2d");
			t.imageSmoothingEnabled = !1;
			for (var i = this._audioCtrl.buffer(), e = null, a = this.$.canvas.height / i.numberOfChannels, n = 0, o = 0; o < i.numberOfChannels; ++o) e = this._getPeaks(i, o, this.$.canvas.width), this._drawWave(t, e, 0, n, this.$.canvas.width, a), i.numberOfChannels > 1 && this._drawChannelTip(t, o, n), n += a
		}
	},
	showLoaderAfter: function(t) {
		var i = this;
		this.$.loader.hidden !== !1 && (this._loaderID || (this._loaderID = setTimeout(function() {
			i.$.loader.hidden = !1, i._loaderID = null
		}, t)))
	},
	hideLoader: function() {
		clearTimeout(this._loaderID), this._loaderID = null, this.$.loader.hidden = !0
	},
	_getPeaks: function(t, i, e) {
		for (var a = t.length / e, n = ~~(a / 10) || 1, o = new Float32Array(e), r = t.getChannelData(i), s = 0; e > s; s++) {
			for (var d = ~~(s * a), u = ~~(d + a), l = 0, h = d; u > h; h += n) {
				var f = r[h];
				f > l ? l = f : -f > l && (l = -f)
			}
			o[s] = l
		}
		return o
	},
	_drawChannelTip: function(t, i, e) {
		var a = 0;
		t.fillStyle = "#aaa", Editor.isRetina ? (t.font = "24px Arial", a = 24) : (t.font = "12px Arial", a = 12), t.fillText("ch" + (i + 1), 4, e + a)
	},
	_drawWave: function(t, i, e, a, n, o) {
		var r = 0;
		r = Editor.isRetina ? .25 : .5;
		var s = o / 2,
			d = a + s,
			u = i.length,
			l = 1;
		t.fillStyle = "#ff8e00", n !== u && (l = n / u), t.beginPath(), t.moveTo(r, d);
		for (var h = 0; u > h; h++) {
			var f = Math.round(i[h] * s);
			t.lineTo(h * l + r, d + f)
		}
		t.lineTo(n + r, d), t.moveTo(r, d);
		for (var h = 0; u > h; h++) {
			var f = Math.round(i[h] * s);
			t.lineTo(h * l + r, d - f)
		}
		t.lineTo(n + r, d), t.fill(), t.fillRect(0, d - r, n, 2 * r)
	},
	_tickProgress: function() {
		var t = this;
		window.requestAnimationFrame(function() {
			if ("stopped" === t.state) return void t.setProgress(0);
			if ("paused" !== t.state) {
				var i = t._audioCtrl.buffer().duration,
					e = t._audioCtrl.time() % i,
					a = e / i;
				t.setProgress(a), t._tickProgress()
			}
		})
	}
});