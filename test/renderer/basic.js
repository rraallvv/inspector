'use strict';

Editor.require('app://editor/test-utils/page-init-for-test');
Editor.require('app://editor/page/register-ui-properties');
Editor.require('app://editor/page/register-inspector');

// =========================================

let simple = cc.Class({
  extends: cc.Component,
  name: 'simple',
  properties: {
    hello: {
      default: 'hello world',
    },
  },
});

let foobar = cc.Class({
  extends: cc.Component,
  name: 'foobar',
  editor: {
    inspector: 'packages://inspector/test/fixtures/foobar-inspector.html'
  },
  properties: {
    foo: {
      default: 100,
    },
    bar: {
      default: 'bar',
    },
  },
});

cc.engine = {
  attachedObjsForEditor: {},
  getInstanceById: function (uuid) {
    return this.attachedObjsForEditor[uuid] || null;
  },
};

let canvas = document.createElement('canvas');
canvas.id = 'test-canvas';
document.body.appendChild(canvas);
cc.game.run({
  width: 128,
  height: 128,
  id: canvas.id,
  debugMode: cc.DebugMode.INFO
});

// =========================================

describe('<editor-inspector>', function() {
  Helper.runPanel( 'inspector.panel' );
  this.timeout(0);

  it('should load and show custom inspector', function( done ) {
    let targetEL = Helper.targetEL;

    let node = new cc.ENode();
    node.addComponent(simple);
    node.addComponent(foobar);

    let dump = Editor.getNodeDump(node);
    dump = JSON.stringify(dump);

    targetEL._queryID = null;
    targetEL._selectType = 'node';
    targetEL._selectID = node.uuid;
    Helper.recv('scene:reply-query-node', null, dump);

    setTimeout(function () {
      let foobarInspector = targetEL.querySelector('foobar-inspector');
      assert(foobarInspector);

      let h2 = foobarInspector.querySelector('h2');
      assert( h2.innerHTML, 'Custom Inspector' );

      done();
    }, 500 );
  });

  it.skip('should send scene:node-set-property ipc message when change property');
});
