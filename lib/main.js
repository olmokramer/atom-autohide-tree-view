'use babel';
import SubAtom from 'sub-atom';

import {
  enable as enableAutohide,
  disable as disableAutohide,
} from './autohide-tree-view.js';

import {
  destroy as destroyPinView,
  initialize as initializePinView,
  activate as pin,
  deactivate as unpin,
  toggle as togglePinned,
} from './pin-view.js';

import {
  getConfig,
  toggleConfig,
  migrateConfig,
} from './config.js';

export config from './config.js';

var disposables;

export function activate() {
  migrateConfig();

  disposables = new SubAtom();

  disposables.add(atom.commands.add('atom-workspace', {
    ['autohide-tree-view:pin']() {
      pin();
    },
    ['autohide-tree-view:unpin']() {
      unpin();
    },
    ['autohide-tree-view:toggle-pinned']() {
      togglePinned();
    },
    ['autohide-tree-view:toggle-push-editor']() {
      toggleConfig('pushEditor');
    },
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

export {
  provideService,
  provideServiceV2,
  provideServiceV3,
} from './service-provider.js';

export {
  consumeTouchSwipeLeftService,
  consumeTouchSwipeRightService,
} from './touch-events.js';
