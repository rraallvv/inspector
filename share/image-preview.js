'use strict';

Editor.registerElement({
  properties: {
    info: {
      type: String,
      value: 'Unknown',
    },

    target: {
      type: Object,
      value: null,
    },

    uuid: {
      type: String,
      value: '',
      observer: '_uuidChanged'
    },

    mtime: {
      type: Number,
      value: 0,
    },
  },

  // true = sprie false = sprite frame
  _getSize: function () {
    var width = 0, height = 0;
    if (this.target.__assetType__ === 'texture' && this.target.type === 'sprite') {
      width = this._image.width;
      height = this._image.height;
    }
    else if ( this.target.__assetType__ === 'sprite-frame' ) {
      width = this.target.width;
      height = this.target.height;
    }
    return { width: width, height: height };
  },

  _uuidChanged () {
    if ( !this.uuid )
      return;

    this._image = new Image();
    this._image.onload = () => {
      let size = this._getSize();
      this.info = size.width + ' x ' + size.height;
      this.resize();
    };
    this._image.src = 'uuid://' + this.uuid + '?' + this.mtime;
  },

  resize () {
    var bcr = this.$.content.getBoundingClientRect();
    let size = this._getSize();
    var result = Editor.Utils.fitSize(
      size.width,
      size.height,
      bcr.width,
      bcr.height
    );

    if ( this.target.rotated ) {
      this._scalingSize = {
        width: Math.ceil(result[1]),
        height: Math.ceil(result[0])
      }
    }

    this.$.canvas.width = Math.ceil(result[0]);
    this.$.canvas.height = Math.ceil(result[1]);

    //
    this.repaint();
  },

  repaint () {
    if ( !this.target ) {
      return;
    }

    var ctx = this.$.canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    var canvasWidth = this.$.canvas.width;
    var canvasHeight = this.$.canvas.height;

    if ( this.target.__assetType__ === 'texture' && this.target.type === 'sprite' ) {

      ctx.drawImage( this._image, 0, 0, canvasWidth, canvasHeight );

      if ( this.target.subMetas ) {
        this.target.subMetas.forEach( meta => {
          var xRatio = canvasWidth / this._image.width;
          var yRatio = canvasHeight / this._image.height;

          ctx.beginPath();
          ctx.rect(
            meta.trimX * xRatio,
            meta.trimY * yRatio,
            meta.width * xRatio,
            meta.height * yRatio
          );
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#ff00ff';
          ctx.stroke();
        });
      }
    }
    else if ( this.target.__assetType__ === 'sprite-frame' ) {
      var xPos, yPos, trimWidth, trimHeight;
      if ( this.target.rotated ) {
        var tempXPos = canvasWidth / 2;
        var tempYPos = canvasHeight / 2;
        ctx.translate(tempXPos, tempYPos);
        ctx.rotate(-90 * Math.PI / 180);
        ctx.translate(-tempXPos, -tempYPos);

        xPos = canvasWidth / 2 - this._scalingSize.width / 2;
        yPos = canvasHeight / 2 - this._scalingSize.height / 2;
        trimWidth = this.target.height;
        trimHeight = this.target.width;
        canvasWidth = this.$.canvas.height;
        canvasHeight = this.$.canvas.width;
      }
      else {
        xPos = 0; yPos = 0;
        trimWidth = this.target.width;
        trimHeight = this.target.height;
        canvasWidth = this.$.canvas.width;
        canvasHeight = this.$.canvas.height;
      }

      ctx.drawImage(
          this._image,
          this.target.trimX, this.target.trimY, trimWidth, trimHeight,
          xPos, yPos, canvasWidth, canvasHeight
      );
    }
  },
});
