'use babel';
import SubAtom from 'sub-atom';

import {
  enable as enableAutohide,
  disable as disableAutohide,
  toggleEnabled as toggleAutohide,
  isEnabled as autohideEnabled,
  show as showTreeView,
  hide as hideTreeView,
  isVisible as treeViewVisible,
} from './autohide-tree-view.js';

import {
  destroy as destroyPinView,
  initialize as initializePinView,
} from './pin-view.js';

import {
  getConfig,
  migrateConfig,
} from './config.js';

export config from './config.js';

var disposables;

export function activate() {
  migrateConfig();

  disposables = new SubAtom();

  disposables.add(atom.commands.add('atom-workspace', {
    'autohide-tree-view:enable': () => enableAutohide(),
    'autohide-tree-view:disable': () => disableAutohide(),
    'autohide-tree-view:toggle-enabled': () => toggleAutohide(),
  }));

  disposables.add(atom.config.observe('autohide-tree-view.maxWindowWidth', maxWindowWidth =>
    onWindowResize(maxWindowWidth)
  ));

  disposables.add(window, 'resize', () =>
    onWindowResize()
  );

  initializePinView();
}

export function deactivate() {
  disableAutohide();
  destroyPinView();
  disposables.dispose();
  disposables = null;
}

function onWindowResize(maxWindowWidth = getConfig('maxWindowWidth')) {
  maxWindowWidth == 0 || window.innerWidth < maxWindowWidth ? enableAutohide() : disableAutohide();
}

// provide service for other packages to control the tree view
export function provideService() {
  return {
    show: showTreeView,
    hide: hideTreeView,
    enable: enableAutohide,
    disable: disableAutohide,
  };
}

export function provideServiceV2() {
  return {
    show: showTreeView,
    hide: hideTreeView,
    isVisible: treeViewVisible,
    enable: enableAutohide,
    disable: disableAutohide,
    isEnabled: autohideEnabled,
  };
}

export {
  consumeTouchSwipeLeftService,
  consumeTouchSwipeRightService,
} from './touch-events.js';
