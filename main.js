'use strict';

const BrowserWindow = require('browser-window');

module.exports = {
    load () {
    },

    unload () {
    },

    'inspector:open' () {
        Editor.Panel.open('inspector.panel');
    },

    'inspector:popup-comp-menu' ( event, x, y, nodeID ) {
        let menuTmpl = Editor.Menu.getMenu('add-component');
        Editor.Menu.walk(menuTmpl, item => {
            if ( item.params ) {
                item.params.unshift(nodeID);
            }
        });

        let editorMenu = new Editor.Menu(menuTmpl, event.sender);
        x = Math.floor(x);
        y = Math.floor(y);
        editorMenu.nativeMenu.popup(BrowserWindow.fromWebContents(event.sender), x, y);
        editorMenu.dispose();
    },
};
