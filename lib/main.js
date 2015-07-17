'use babel';
import SubAtom from 'sub-atom';

import { enableAutohide, disableAutohide, toggleAutohide, autohideEnabled, showTreeView, hideTreeView, treeViewVisible } from './autohide-tree-view.js';

import { destroy as destroyPinView, initialize as initializePinView } from './pin-view.js';

import { getConfig } from './utils.js';

export config from './config.js';

var disposables;

export function activate() {
  disposables = new SubAtom();

  disposables.add(atom.commands.add('atom-workspace', {
    'autohide-tree-view:enable': enableAutohide,
    'autohide-tree-view:disable': disableAutohide,
    'autohide-tree-view:toggle-enabled': toggleAutohide
  }));

  disposables.add(atom.config.observe('autohide-tree-view.maxWindowWidth', onDidResizeWindow));

  disposables.add(window, 'resize', onDidResizeWindow);

  initializePinView();
}

export function deactivate() {
  disableAutohide();
  destroyPinView();
  disposables.dispose();
  disposables = null;
}

// provide service for other packages to control the tree view
export function provideService() {
  return {
    show: showTreeView,
    hide: hideTreeView,
    enable: enableAutohide,
    disable: disableAutohide
  };
}

export function provideServiceV2() {
  return {
    show: showTreeView,
    hide: hideTreeView,
    isVisible: treeViewVisible,
    enable: enableAutohide,
    disable: disableAutohide,
    isEnabled: autohideEnabled
  };
}

export { consumeTouchSwipeLeftService, consumeTouchSwipeRightService } from './touch-events.js';

function onDidResizeWindow(maxWindowWidth) {
  if(typeof maxWindowWidth != 'number') maxWindowWidth = getConfig('maxWindowWidth');
  maxWindowWidth == 0 || window.innerWidth < maxWindowWidth ? enableAutohide() : disableAutohide();
}
