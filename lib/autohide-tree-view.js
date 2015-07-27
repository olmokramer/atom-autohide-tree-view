'use babel';
import 'object-assign-shim';

import {
  CompositeDisposable,
} from 'atom';

import SubAtom from 'sub-atom';

import pinView from './pin-view.js';

import {
  hoverArea,
} from './hover-events.js';

import {
  enable as enableHoverEvents,
  disable as disableHoverEvents,
} from './hover-events.js';

import {
  enable as enableClickEvents,
  disable as disableClickEvents,
} from './click-events.js';

import {
  enable as enableTouchEvents,
  disable as disableTouchEvents,
} from './touch-events.js';

import {
  getConfig,
  toggleConfig,
} from './config.js';

import {
  getTreeView,
  getTreeViewEl,
  getContentWidth,
  logError,
  storeFocusedElement,
  clearFocusedElement,
  restoreFocus,
} from './utils.js';

var enabled = false;

export function enable() {
  if(enabled) return;
  enabled = true;

  // check if the tree view package is loaded and
  // wait until the tree view package is activated
  Promise.resolve(
    atom.packages.isPackageLoaded('tree-view') &&
    atom.packages.activatePackage('tree-view')
  ).then(treeViewPkg => {
    if(!treeViewPkg) return;
    initTreeView(treeViewPkg);
    handleEvents();
    // start with pushEditor = true, we'll change it back later
    return update(true);
  }).then(() => update()).catch(logError);
}

export function disable() {
  if(!enabled) return;
  enabled = false;

  disposables.dispose();
  disposables = null;

  disableHoverEvents();
  disableClickEvents();
  disableTouchEvents();
  // the stylesheet will be removed before the animation is finished
  // which will reset the minWidth to 100px... it looks ugly, so set
  // minWidth on the element to prevent this
  getTreeViewEl().style.minWidth = '0px';
  // update with pushEditor = true for a nicer animation
  // then show the tree view
  update(!isVisible()).then(() => show()).then(() => {
    // animate the tree view's panel if the tree view
    // is already visible and pushEditor is false
    if(isVisible() && !getConfig('pushEditor')) {
      var treeViewEl = getTreeViewEl();
      return animate(treeViewEl.clientWidth, 0, treeViewEl.parentNode);
    }
  }).then(() =>
    // finally dispose of the tree view and reset variables
    deinitTreeView()
  ).catch(logError);
}

export function isEnabled() {
  return enabled;
}

export function toggleEnabled() {
  return enabled ? disable() : enable();
}

// keep references to the tree view model and element
function initTreeView() {
  getTreeViewEl().setAttribute('data-autohide', '');
  getTreeView().scroller[0].appendChild(pinView);
}

// remove the styles etc. on the tree view
function deinitTreeView() {
  getTreeViewEl().removeAttribute('data-autohide');
  Object.assign(getTreeViewEl().style, {
    position: '',
    height: '',
    minWidth: '',
  });

  var panelView = atom.views.getView(getTreeView().panel);
  if(panelView) panelView.style.width = '';

  visible = false;
}

var disposables;

function handleEvents() {
  disposables = new SubAtom();

  disposables.add(new CompositeDisposable(
    // changes to these settings should trigger an update
    atom.config.onDidChange('autohide-tree-view.pushEditor', pushEditor =>
      update(pushEditor)
    ),
    atom.config.onDidChange('autohide-tree-view.minWidth', () =>
      update()
    ),
    atom.config.onDidChange('tree-view.showOnRightSide', () =>
      update()
    ),
    atom.config.onDidChange('tree-view.hideIgnoredNames', () =>
      update()
    ),
    atom.config.onDidChange('tree-view.hideVcsIgnoredFiles', () =>
      update()
    ),
    atom.config.onDidChange('core.ignoredNames', () =>
      update()
    ),
    atom.config.observe('autohide-tree-view.showOn', showOn => {
      showOn.match('hover') ? enableHoverEvents() : disableHoverEvents();
      showOn.match('click') ? enableClickEvents() : disableClickEvents();
      showOn.match('touch') ? enableTouchEvents() : disableTouchEvents();
    }),

    // resize the tree view when project.paths changes
    atom.project.onDidChangePaths(resize),

    // add command listeners
    atom.commands.add('atom-workspace', {
      // own commands
      ['autohide-tree-view:toggle-push-editor']() {
        toggleConfig('pushEditor');
      },
      // atom core commands
      ['tool-panel:unfocus']() {
        hide();
      },
      // tree-view commands
      ['tree-view:show'](event) {
        event.stopImmediatePropagation();
        show();
      },
      // this one isn't actually in the tree-view package
      // but have it here just in case :)
      ['tree-view:hide'](event) {
        event.stopImmediatePropagation();
        hide();
      },
      ['tree-view:toggle'](event) {
        event.stopImmediatePropagation();
        toggle();
      },
      ['tree-view:reveal-active-file']() {
        revealActiveFile();
      },
      ['tree-view:toggle-focus']() {
        toggle();
      },
      ['tree-view:remove']() {
        resize();
      },
      ['tree-view:paste']() {
        resize();
      },
      ['tree-view:expand-directory']() {
        resize();
      },
      ['tree-view:recursive-expand-directory']() {
        resize();
      },
      ['tree-view:collapse-directory']() {
        resize();
      },
      ['tree-view:recursive-collapse-directory']() {
        resize();
      },
      // tree-view-finder package commands
      ['tree-view-finder:toggle']() {
        resize().then(show);
      },
    }),

    // clear the focused element when a modal panel is created
    // because modal panels close when they lose focus
    atom.commands.add('atom-workspace', 'command-palette:toggle', () =>
      clearFocusedElement()
    ),
    atom.workspace.panelContainers.modal.onDidAddPanel(() =>
      clearFocusedElement()
    ),
  ));

  // hide the tree view when a file is opened by a command
  for(let direction of ['', '-right', '-left', '-up', '-down']) {
    disposables.add(atom.commands.add('atom-workspace', `tree-view:open-selected-entry${direction}`, () =>
      hide()
    ));
  }

  for(let i of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    disposables.add(atom.commands.add('atom-workspace', `tree-view:open-selected-entry-in-pane-${i}`, () =>
      hide()
    ));
  }

  // resize the tree view when opening/closing a directory
  disposables.add(getTreeViewEl(), 'click', '.entry.directory', event => {
    // prevent closing the tree view
    event.stopPropagation();
    resize();
  });
}

// updates styling on the .tree-view-resizer and the panel (container)
function update(pushEditor = getConfig('pushEditor')) {
  return Promise.resolve().then(() => {
    updateTreeView(pushEditor);
    updatePanel(pushEditor);
  }).then(resize).catch(logError);
}

function updateTreeView(pushEditor) {
  var statusBarEl = document.querySelector('status-bar');
  Object.assign(getTreeViewEl().style, {
    position: pushEditor ? '' : 'absolute',
    height: !pushEditor && statusBarEl ? `calc(100% - ${statusBarEl.clientHeight}px)` : '',
  });
}

function updatePanel(pushEditor) {
  var panelView = atom.views.getView(getTreeView().panel);
  if(!panelView) return; // tree view not attached
  panelView.style.width = pushEditor ? '' : `${getConfig('minWidth')}px`;
  // make sure the tree view is at the far end of the screen
  var parentNode = panelView.parentNode;
  if(getConfig('showOnRightSide', 'tree-view')) {
    parentNode.appendChild(panelView);
  } else {
    parentNode.insertBefore(panelView, parentNode.firstChild);
  }
}

var visible = false;

// shows the tree view
export function show(delay = 0, shouldDisableHoverEvents = true) {
  visible = true;
  // disable hover events on the tree view when this
  // show is not triggered by a hover event
  if(shouldDisableHoverEvents) disableHoverEvents();
  // keep a reference to the currently focused element
  // so we can restore focus when the tree view will hide
  storeFocusedElement();
  // focus the tree view if the animation finished
  return animate(getContentWidth(), delay).then(finished => {
    hoverArea.style.pointerEvents = 'none';
    finished && !!getTreeView().focus();
  });
}

// hides the tree view
export function hide(delay = 0) {
  visible = false;
  // enable hover events
  enableHoverEvents();
  hoverArea.style.pointerEvents = '';
  // focus the element that had focus when show() was triggered
  restoreFocus();
  return animate(getConfig('minWidth'), delay);
}

export function isVisible() {
  return visible;
}

// toggles the tree view
export function toggle(delay = 0) {
  return visible ? hide(delay) : show(delay);
}

// resizes the tree view to fit the content
function resize() {
  return Promise.resolve().then(() =>
    visible ? show(0, false) : hide()
  );
}

var currentAnimation = null;

// the animation function resolves with 'true' if the
// animation finished, with 'false' if cancelled
function animate(targetWidth, delay, element = getTreeViewEl()) {
  // get the initial width of the element
  var initialWidth = element.clientWidth;
  // set animationSpeed to Infinity if it equals 0
  var animationSpeed = getConfig('animationSpeed') || Infinity;
  // calculate the animation duration if animationSpeed
  // equals 0 divide by Infinity for a duration of 0
  var duration = Math.abs(targetWidth - initialWidth) / animationSpeed;

  // cancel any current animation
  if(currentAnimation && currentAnimation.playState !== 'finished') {
    currentAnimation.cancel();
    delay = 0; // immediately trigger the next animation
  }

  return new Promise(resolve => {
    // check if animation necessary
    if(duration == 0) return void setTimeout(() => {
      element.style.width = `${targetWidth}px`;
      resolve(true);
    }, delay);

    // cache the current animationPlayer so we can
    // cancel it as soon as another animation begins
    var animation = currentAnimation = element.animate([
      {width: initialWidth},
      {width: targetWidth},
    ], {duration, delay});

    animation.addEventListener('finish', function finish() {
      animation.removeEventListener('finish', finish);
      // if cancelled, resolve with false
      if(animation.playState != 'finished') return void resolve(false);
      // prevent tree view from resetting its width to initialWidth
      element.style.width = `${targetWidth}px`;
      // reset the currentAnimation reference
      currentAnimation = null;
      resolve(true);
    });
  }).catch(logError);
}

function revealActiveFile() {
  process.nextTick(() =>
    show().then(() =>
      getTreeView().scrollToEntry(getTreeView().getSelectedEntries()[0])
    )
  );
}
