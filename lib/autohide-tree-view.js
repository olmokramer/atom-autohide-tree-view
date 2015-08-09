'use babel';
import 'object-assign-shim';

import SubAtom from 'sub-atom';

import pinView from './pin-view.js';

import initCommands from './commands.js';

import {
  hoverArea,
  disable as disableHoverEvents,
  isEnabled as hoverEventsEnabled,
  disableUntilBlur as disableHoverEventsUntilBlur,
} from './hover-events.js';

import {
  disable as disableClickEvents,
} from './click-events.js';

import {
  disable as disableTouchEvents,
} from './touch-events.js';

import {
  getConfig,
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
  if(enabled) return Promise.resolve();
  enabled = true;

  // check if the tree view package is loaded and
  // wait until the tree view package is activated
  return Promise.resolve(
    atom.packages.isPackageLoaded('tree-view') &&
    atom.packages.activatePackage('tree-view')
  ).then(treeViewPkg => {
    if(!treeViewPkg) return;
    initTreeView(treeViewPkg);
    handleEvents();
    // start with pushEditor = true, we'll change it back
    // with the next update()
    return update(true);
  }).then(() => update()).catch(logError);
}

export function disable() {
  if(!enabled) return Promise.resolve();
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
  // update with pushEditor = !isVisible() for a nicer animation
  // then show the tree view
  return update(!isVisible()).then(() => show()).then(() => {
    // animate the tree view's panel if the tree view is already
    // visible. this isn't necessary when pushEditor === true
    // because then the parent has the same width as the tree view
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
  getTreeViewEl().appendChild(pinView);
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

  disposables.add(initCommands());

  // resize the tree view when opening/closing a directory
  disposables.add(getTreeViewEl(), 'click', '.entry.directory', () =>
    resize()
  );

  disposables.add(getTreeViewEl(), 'click', '.entry.file', () => {
    var disposable = atom.workspace.onDidChangeActivePaneItem(paneItem => {
      console.log(paneItem);
      clearFocusedElement();
      storeFocusedElement(atom.views.getView(paneItem));
      disposable.dispose();
    });
  });

  // disable shrinking of the tree view after a manual resize
  disposables.add(getTreeViewEl().querySelector('.tree-view-resize-handle'), 'mousedown', () => {
    if(isVisible()) disableTreeViewShrinking();
  });
}

// updates styling on the .tree-view-resizer and the panel (container)
export function update(pushEditor = getConfig('pushEditor')) {
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
  if(shouldDisableHoverEvents && hoverEventsEnabled()) {
    disposables.add(disableHoverEventsUntilBlur());
  }
  // keep a reference to the currently focused element
  // so we can restore focus when the tree view will hide
  storeFocusedElement();
  var treeViewWidth = getContentWidth();
  // don't resize the tree view if its width is
  // larger than the target width and shrinking
  // is disabled
  if(!treeViewShrinking) {
    treeViewWidth = Math.max(treeViewWidth, getTreeViewEl().clientWidth);
  }
  return animate(treeViewWidth, delay).then(finished => {
    // make sure the hover area doesn't block tree items
    hoverArea.style.pointerEvents = 'none';
    // focus the tree view if the animation finished
    if(finished) getTreeView().focus();
    return finished;
  });
}

// hides the tree view
export function hide(delay = 0) {
  visible = false;
  // enable tree view shrinking upon opening a directory
  enableTreeViewShrinking();
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
export function resize() {
  return Promise.resolve().then(() =>
    visible ? show(0, false) : hide()
  );
}

var treeViewShrinking = true;

function disableTreeViewShrinking() {
  treeViewShrinking = false;
}

function enableTreeViewShrinking() {
  treeViewShrinking = true;
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
