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

  _uuidChanged () {
    if ( !this.uuid )
      return;

    this._image = new Image();
    this._image.onload = () => {
      this.info = this._image.width + ' x ' + this._image.height;
      this.resize();
    };
    this._image.src = 'uuid://' + this.uuid + '?' + this.mtime;
  },

  resize () {
    var bcr = this.$.content.getBoundingClientRect();
    var result = Editor.Utils.fitSize(
      this._image.width,
      this._image.height,
      bcr.width,
      bcr.height
    );
    this.$.canvas.width = Math.ceil(result[0]);
    this.$.canvas.height = Math.ceil(result[1]);

    //
    this.repaint();
  },

  repaint () {
    var ctx = this.$.canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage( this._image, 0, 0, this.$.canvas.width, this.$.canvas.height );

    if ( this.target && this.target.type === 'sprite' ) {
      if ( this.target.subMetas ) {
        this.target.subMetas.forEach( meta => {
          var xRatio = this.$.canvas.width / this._image.width;
          var yRatio = this.$.canvas.height / this._image.height;

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

    // TODO
    // if ( this.asset instanceof cc.SpriteFrame ) {
    //   if ( this.rawTexture ) {
    //     ctx.drawImage( this.rawTexture.image,
    //             this.asset.trimX, this.asset.trimY, this.asset.width, this.asset.height,
    //             0, 0, this.$.canvas.width, this.$.canvas.height
    //            );
    //   }

    //   this.$.dragleft.style.display = 'block';
    //   this.$.dragtop.style.display = 'block';
    //   this.$.dragbottom.style.display = 'block';
    //   this.$.dragright.style.display = 'block';

    //   this.updateLine();
    // }
  },
});
