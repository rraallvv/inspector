'use strict';

Editor.require('app://editor/test-utils/renderer/init');
Editor.require('app://editor/page/register-ui-properties');
Editor.require('app://editor/page/register-inspector');

// =========================================

Helper.runGame(1,1);

let SimpleInfo = cc.Class({
  name: 'SimpleInfo',
  properties: {
    id: { default: 100 },
    name: { default: 'Unknown' },
  }
});

let Foobar = cc.Class({
  extends: cc.Component,
  name: 'Foobar',
});

let UnregisterType = cc.Class({
  extends: cc.Asset,
  name: 'UnregisterType',
});


let Simple = cc.Class({
  extends: cc.Component,
  name: 'Simple',
  properties: {
    text: {
      default: 'hello world',
      type: 'String',
    },
    checked: {
      default: false,
    },
    foobar: {
      default: null,
      type: Foobar,
    },
    unregister: {
      default: null,
      type: UnregisterType,
    },
    asset: {
      default: null,
      type: cc.Asset,
    },
    nullStructure: {
      default: null,
      type: SimpleInfo,
    },
    strcture: {
      default () { return new SimpleInfo(); },
      type: SimpleInfo,
    },
    simpleArray: {
      default () { return [
        cc.v2(10, 10),
        cc.v2(20, 20),
        cc.v2(30, 30),
      ]; },
      type: cc.Vec2,
    },
  },
});

// =========================================

describe('<editor-inspector>', function() {
  Helper.runPanel( 'inspector.panel' );
  this.timeout(0);

  it('should be a demo', function( done ) {
    try {
      let tmpNode = new cc.Node('Temp Node');
      tmpNode.addComponent(Foobar);

      let myNode = new cc.Node('My Node');
      let simpleComp = myNode.addComponent(Simple);
      simpleComp.foobar = tmpNode.getComponent(Foobar);

      // comment out to get a type error
      simpleComp.foobar = tmpNode;
      simpleComp.text = 10;

      // ===================
      let targetEL = Helper.targetEL;
      targetEL._queryID = null;
      targetEL._selectType = 'node';
      targetEL._selectID = myNode.uuid;
      let dump = Editor.getNodeDump(myNode);
      Helper.recv('scene:reply-query-node', null, JSON.stringify(dump));
    } catch ( err ) {
      console.error(err);
    }
  });
});
