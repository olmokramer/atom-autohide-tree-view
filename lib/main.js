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

    disposables.add(atom.workspace.onDidDestroyPaneItem(updateActivationState));

    disposables.add(atom.workspace.observePaneItems(updateActivationState));

    disposables.add(observeConfig('maxWindowWidth', updateActivationState));

    disposables.add(window, 'resize', updateActivationState);
  });
}

export function deactivate() {
  stop();
  disposables.dispose();
  disposables = null;
}

// determine if autohide should be enabled based on the window
// width, number of files open and whether the tree view is pinned
function updateActivationState() {
  if(pinView.parentNode && pinView.isActive) return;

  var maxWindowWidth = getConfig('maxWindowWidth') || Infinity;
  var isWindowTooSmall = maxWindowWidth == 0 || window.innerWidth < maxWindowWidth;
  var hasOpenFiles = atom.workspace.getPaneItems().length > 0;

  isWindowTooSmall && hasOpenFiles ? start() : stop();
}

function start() {
  enableAutohide();
  var treeViewEl = getTreeViewEl();
  treeViewEl.insertBefore(pinView, treeViewEl.firstChild);
}

function stop() {
  disableAutohide();
  pinView.remove();
}
