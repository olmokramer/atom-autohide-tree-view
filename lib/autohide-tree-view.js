'use babel';
import 'object-assign-shim';

import SubAtom from 'sub-atom';

import pinView from './pin-view.js';

import { enableHoverEvents, disableHoverEvents, hoverEventsEnabled } from './hover-events.js';
import { enableClickEvents, disableClickEvents } from './click-events.js';
import { enableTouchEvents, disableTouchEvents } from './touch-events.js';

import { getTreeView, getTreeViewEl, getContentWidth, logError, getConfig, toggleConfig } from './utils.js';

var enabled = false;

function enable() {
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

function disable() {
  if(!enabled) return;
  enabled = false;

  disposables.dispose();
  disableHoverEvents();
  disableClickEvents();
  disableTouchEvents();
  // the stylesheet will be removed before the animation is finished
  // which will reset the minWidth to 100px... it looks ugly, so set
  // minWidth on the element to prevent this
  getTreeViewEl().style.minWidth = '1px';
  // update with pushEditor = true for a nicer animation
  // then show the tree view
  update(true).then(() => show()).then(() => {
    // finally dispose of the tree view and reset variables
    deinitTreeView();
    visible = false;
    [ disposables, focusedElement ] = [];
  }).catch(logError);
}

function isEnabled() {
  return enabled;
}

function toggleEnabled() {
  return enabled ? disable() : enable();
}

// keep references to the tree view model and element
function initTreeView() {
  getTreeViewEl().setAttribute('data-autohide', '');
  getTreeView().list[0].appendChild(pinView);
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
}

var disposables;

function handleEvents() {
  disposables = new SubAtom();

  // changes to these settings should trigger an update
  disposables.add(atom.config.onDidChange('autohide-tree-view.pushEditor', update));
  disposables.add(atom.config.onDidChange('autohide-tree-view.hiddenWidth', update));
  disposables.add(atom.config.onDidChange('tree-view.showOnRightSide', update));
  disposables.add(atom.config.onDidChange('tree-view.hideIgnoredNames', update));
  disposables.add(atom.config.onDidChange('tree-view.hideVcsIgnoredFiles', update));
  disposables.add(atom.config.onDidChange('core.ignoredNames', update));

  disposables.add(atom.config.observe('autohide-tree-view.showOn', showOn => {
    showOn.match('hover') ? enableHoverEvents() : disableHoverEvents();
    showOn.match('click') ? enableClickEvents() : disableClickEvents();
    showOn.match('touch') ? enableTouchEvents() : disableTouchEvents();
  }));

  // resize the tree view when project.paths changes
  disposables.add(atom.project.onDidChangePaths(resize));

  // add command listeners
  disposables.add(atom.commands.add('atom-workspace', {
    // own commands
    'autohide-tree-view:toggle-push-editor': () => toggleConfig('pushEditor'),

    // atom core commands
    'tool-panel:unfocus': hide,

    // tree-view commands
    'tree-view:show': function treeViewShowOverride(event) {
      event.stopImmediatePropagation();
      show();
    },
    'tree-view:hide': function treeViewHideOverride(event) {
      event.stopImmediatePropagation();
      hide();
    },
    'tree-view:toggle': function treeViewToggleOverride(event) {
      event.stopImmediatePropagation();
      toggle();
    },
    'tree-view:reveal-active-file': revealActiveFile,
    'tree-view:toggle-focus': toggle,
    'tree-view:remove': resize,
    'tree-view:paste': resize,
    'tree-view:expand-directory': resize,
    'tree-view:recursive-expand-directory': resize,
    'tree-view:collapse-directory': resize,
    'tree-view:recursive-collapse-directory': resize,

    // tree-view-finder package commands
    'tree-view-finder:toggle': () => resize().then(show),
  }));

  disposables.add('atom-workspace', 'mousedown', 'atom-text-editor', disableHoverEvents);

  disposables.add('atom-workspace', 'mouseup', 'atom-text-editor', enableHoverEvents);

  disposables.add(getTreeView().list, 'blur', () => {
    if(hoverEventsEnabled()) return;
    // clear the focused element so the element the user
    // clicked will get focus
    clearFocusedElement();
    hide();
  });

  // resize the tree view when opening/closing a directory
  disposables.add(getTreeViewEl(), 'click', '.entry.directory', event => {
    // prevent closing the tree view
    event.stopPropagation();
    resize();
  });

  // hide the tree view when a file is opened by a command
  for(let direction of ['', '-right', '-left', '-up', '-down']) {
    disposables.add(atom.commands.add('atom-workspace', `tree-view:open-selected-entry${direction}`, hide));
  }

  for(let i of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    disposables.add(atom.commands.add('atom-workspace', `tree-view:open-selected-entry-in-pane-${i}`, hide));
  }

  // these commands create a dialog that should keep focus
  // when the tree view hides
  for(let command of ['add-file', 'add-folder', 'duplicate', 'rename', 'move']) {
    disposables.add(atom.commands.add('atom-workspace', `tree-view:${command}`, clearFocusedElement));
  }
}

// updates styling on the .tree-view-resizer and the panel (container)
function update(pushEditor) {
  if(typeof pushEditor != 'boolean') pushEditor = getConfig('pushEditor');
  return Promise.resolve().then(function updater() {
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
  panelView.style.width = pushEditor ? '' : `${getConfig('hiddenWidth')}px`;
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
function show(delay, shouldDisableHoverEvents = true) {
  if(typeof delay != 'number') delay = 0;
  visible = true;
  // disable hover events on the tree view when this
  // show is not triggered by a hover event
  if(shouldDisableHoverEvents) disableHoverEvents();
  // keep a reference to the currently focused element
  // so we can restore focus when the tree view will hide
  if(!focusedElement) storeFocusedElement();
  // focus the tree view if the animation finished
  return animate(getContentWidth(), delay).then(finished =>
    finished && !!getTreeView().focus()
  );
}

// hides the tree view
function hide(delay) {
  if(typeof delay != 'number') delay = 0;
  visible = false;
  // enable hover events
  enableHoverEvents();
  // focus the element that had focus when show() was triggered
  restoreFocus();
  return animate(getConfig('hiddenWidth'), delay);
}

function isVisible() {
  return visible;
}

// toggles the tree view
function toggle(delay) {
  if(typeof delay != 'number') delay = 0;
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
function animate(targetWidth, delay) {
  // get the initial width of the element
  var initialWidth = getTreeViewEl().clientWidth;
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
      getTreeViewEl().style.width = `${targetWidth}px`;
      resolve(true);
    }, delay);

    // cache the current animationPlayer so we can
    // cancel it as soon as another animation begins
    var animation = currentAnimation = getTreeViewEl().animate([
      {width: initialWidth},
      {width: targetWidth},
    ], {duration, delay});

    animation.addEventListener('finish', function finish() {
      animation.removeEventListener('finish', finish);
      // if cancelled, resolve with false
      if(animation.playState != 'finished') return void resolve(false);
      // prevent tree view from resetting its width to initialWidth
      getTreeViewEl().style.width = `${targetWidth}px`;
      // reset the currentAnimation reference
      currentAnimation = null;
      resolve(true);
    });
  }).catch(logError);
}

var focusedElement;

// cache the element that currently has focus
function storeFocusedElement() {
  focusedElement = document.activeElement;
}

// clear the reference to the focusedElement. useful
// when we want to invalidate the next restoreFocus
function clearFocusedElement() {
  focusedElement = null;
}

// restores focus on focusedElement
function restoreFocus() {
  if(!focusedElement) return;
  if(typeof focusedElement.focused === 'function') {
    focusedElement.focused();
  } else if(typeof focusedElement.focus === 'function') {
    focusedElement.focus();
  }
  clearFocusedElement();
}

function revealActiveFile() {
  process.nextTick(() =>
    show().then(() =>
      getTreeView().scrollToEntry(getTreeView().getSelectedEntries()[0])
    )
  );
}

export {
  enable as enableAutohide,
  disable as disableAutohide,
  toggleEnabled as toggleAutohide,
  isEnabled as autohideEnabled,
  show as showTreeView,
  hide as hideTreeView,
  toggle as toggleTreeView,
  isVisible as treeViewVisible,
  getTreeView,
  getTreeViewEl,
};
