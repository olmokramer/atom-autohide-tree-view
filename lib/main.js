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
  observeConfig,
  migrateConfig,
} from './config.js';

import {
  getTreeViewEl,
} from './utils.js';

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

    disposables.add(atom.workspace.onDidDestroyPaneItem(manageActivation));

    disposables.add(atom.workspace.observePaneItems(manageActivation));

    disposables.add(observeConfig('maxWindowWidth', manageActivation));

    disposables.add(window, 'resize', manageActivation);

    getTreeViewEl().appendChild(pinView);
  });
}

export function deactivate() {
  disableAutohide();
  pinView.remove();
  disposables.dispose();
  disposables = null;
}

// determine if autohide should be enabled based on the window
// width, number of files open and whether the tree view is pinned
function manageActivation() {
  var maxWindowWidth = getConfig('maxWindowWidth') || Infinity;
  var isWindowTooSmall = maxWindowWidth == 0 || window.innerWidth < maxWindowWidth;
  var hasOpenFiles = atom.workspace.getPaneItems().length > 0;
  var isPinned = pinView.parentNode && pinView.isActive;

  if(isWindowTooSmall && hasOpenFiles && !isPinned) {
    enableAutohide();
    pinView.attach();
  } else {
    disableAutohide();
    pinView.detach();
  }
}
