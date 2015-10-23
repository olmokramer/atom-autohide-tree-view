'use babel';
import debounce from 'just-debounce';
import {CompositeDisposable} from 'atom';
import {enableAutohide, disableAutohide, toggleAutohide} from './autohide-tree-view.js';
import pinView from './pin-view.js';
import config from './config.js';
import {domListener} from './utils.js';

export {schema as config} from './config.js';
export * from './service-provider.js';
export {consumeTouchEvents} from './touch-events.js';

export var treeView;
export var treeViewEl;

var disposables;

export function activate() {
  if(!atom.packages.isPackageLoaded('tree-view'))
    return atom.notifications.addError('autohide-tree-view: Could not activate because the tree-view package doesn\'t seem to be loaded');

  atom.packages.activatePackage('tree-view').then((pkg) => {
    treeView = pkg.mainModule.createView();
    treeViewEl = atom.views.getView(treeView);

    disposables = new CompositeDisposable(
      atom.workspace.onDidDestroyPaneItem(updateActivationState),
      atom.workspace.observePaneItems(updateActivationState),
      atom.config.observe('autohide-tree-view.maxWindowWidth', updateActivationState),
      domListener(window, 'resize', debounce(updateActivationState, 200)),
    );
  });
}

export function deactivate() {
  stop();
  disposables.dispose();
  [disposables, treeView, treeViewEl] = null;
}

// determine if autohide should be enabled based on the window
// width, number of files open and whether the tree view is pinned
function updateActivationState() {
  if(pinView.isActive()) return;
  var isWindowSmall = window.innerWidth < (config.maxWindowWidth || Infinity);
  var hasOpenFiles = atom.workspace.getPaneItems().length > 0;
  isWindowSmall && hasOpenFiles ? start() : stop();
}

var commandsDisposable;

function start() {
  if(commandsDisposable) return;
  pinView.attach();
  commandsDisposable = new CompositeDisposable(
    atom.commands.add('atom-workspace', {
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
        atom.config.set('autohide-tree-view.pushEditor', !config.pushEditor);
      },
    }),
  );
  enableAutohide();
}

function stop() {
  if(!commandsDisposable) return;
  pinView.detach();
  disableAutohide();
  commandsDisposable.dispose();
  commandsDisposable = null;
}
