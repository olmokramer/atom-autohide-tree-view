'use babel';
import SubAtom from 'sub-atom';

import {
  enable as enableAutohide,
  disable as disableAutohide,
  toggleEnabled as toggleAutohide,
} from './autohide-tree-view.js';

import pinView from './pin-view.js';

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
        disableAutohide();
      },
      ['autohide-tree-view:unpin']() {
        enableAutohide();
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

    pinView.attach();
  });
}

export function deactivate() {
  disableAutohide();
  pinView.detach();
  disposables.dispose();
  disposables = null;
}

function onWindowResize(maxWindowWidth = getConfig('maxWindowWidth')) {
  // ignore when the tree view is pinned
  if(pinView.parentNode && pinView.isActive) return;

  if(maxWindowWidth == 0 || window.innerWidth < maxWindowWidth) {
    enableAutohide();
    pinView.attach();
  } else {
    disableAutohide();
    pinView.detach();
  }
}
