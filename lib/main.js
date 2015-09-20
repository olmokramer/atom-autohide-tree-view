'use babel';
import SubAtom from 'sub-atom';

import {
  enable as enableAutohide,
  disable as disableAutohide,
  toggle as toggleAutohide,
} from './autohide-tree-view.js';

import {
  initialize as initializePinView,
  destroy as destroyPinView,
  isActive as isPinned,
} from './pin-view.js';

import {
  getConfig,
  toggleConfig,
  migrateConfig,
} from './config.js';

export config from './config.js';

export * from './service-provider.js';

export {
  consumeTouchEvents,
} from './touch-events.js';

var disposables;

export function activate() {
  if(!atom.packages.isPackageLoaded('tree-view'))
    return atom.notifications.addError('autohide-tree-view: Could not activate because the tree-view package doesn\'t seem to be loaded');

  migrateConfig();

  atom.packages.activatePackage('tree-view').then(() => {
    disposables = new SubAtom();

    disposables.add(atom.commands.add('atom-workspace', {
      ['autohide-tree-view:pin']() {
        enableAutohide();
      },
      ['autohide-tree-view:unpin']() {
        disableAutohide();
      },
      ['autohide-tree-view:toggle-pinned']() {
        toggleAutohide();
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
  });
}

export function deactivate() {
  disableAutohide();
  destroyPinView();
  disposables.dispose();
  disposables = null;
}

function onWindowResize(maxWindowWidth = getConfig('maxWindowWidth')) {
  if(isPinned()) return;
  maxWindowWidth == 0 || window.innerWidth < maxWindowWidth ? enableAutohide() : disableAutohide();
}
