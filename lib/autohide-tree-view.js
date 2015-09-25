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
  focusTreeView,
} from './utils.js';

var enabled = false;

export function enable() {
  if(enabled) return Promise.resolve();
  enabled = true;

  getTreeViewEl().setAttribute('data-autohide', '');

  handleEvents();
  pinView.deactivate();

  // start with pushEditor = true for a nicer animation
  return update(true).then(() => update()).catch(logError);
}

export function disable() {
  if(!enabled) return Promise.resolve();
  enabled = false;

  disposables.dispose();
  disposables = null;

  disableHoverEvents();
  disableClickEvents();
  disableTouchEvents();

  pinView.activate();

  var treeViewEl = getTreeViewEl();
  // the stylesheet will be removed before the animation is finished
  // which will reset the minWidth to 100px... it looks ugly, so set
  // minWidth on the element to prevent this
  treeViewEl.style.minWidth = '0px';
  // when the tree view is already visible, we don't want to animate
  // with pushEditor == true, because it messes up the animation of
  // the panel element when pushEditor == false in the settings
  return update(!isVisible()).then(() => show()).then(() => {
    // animate the tree view's panel if the tree view is already
    // visible
    if(isVisible())
      return animate(treeViewEl.clientWidth, 0, treeViewEl.parentNode);
  }).then(() => {
    // reset styles and attributes on the tree view
    treeViewEl.removeAttribute('data-autohide');
    Object.assign(treeViewEl.style, {
      position: '',
      height: '',
      minWidth: '',
    });

    var panelView = atom.views.getView(getTreeView().panel);
    if(panelView) panelView.style.width = '';

    visible = false;
  }).catch(logError);
}

export function isEnabled() {
  return enabled;
}

export function toggleEnabled() {
  return enabled ? disable() : enable();
}

var disposables;

function handleEvents() {
  var treeViewEl = getTreeViewEl();

  disposables = new SubAtom();

  disposables.add(initCommands());

  // resize the tree view when opening/closing a directory
  disposables.add(treeViewEl, 'click', '.entry.directory', event => {
    if(event.button == 0) resize();
  });

  disposables.add(treeViewEl, 'click', '.entry.file', event => {
    if(event.button == 0) var disposable = atom.workspace.onDidChangeActivePaneItem(paneItem => {
      storeFocusedElement(atom.views.getView(paneItem));
      disposable.dispose();
    });
  });

  disposables.add(getTreeView().list[0], 'blur', () =>
    clearFocusedElement()
  );

  // disable shrinking of the tree view after a manual resize
  disposables.add(treeViewEl.querySelector('.tree-view-resize-handle'), 'mousedown', event => {
    if(isVisible() && event.button == 0) disableShrinking();
  });

  // hide the tree view when a text editor is focused
  disposables.add(atom.workspace.observeTextEditors(textEditor => {
    var textEditorDisposable = new SubAtom();

    textEditorDisposable.add(atom.views.getView(textEditor), 'focus', () => {
      if(isVisible()) hide();
    });

    textEditorDisposable.add(textEditor.onDidDestroy(() => {
      textEditorDisposable.dispose();
      disposables.remove(textEditorDisposable);
    }));

    disposables.add(textEditorDisposable);
  }));
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
  if(!panelView) return;

  panelView.style.width = pushEditor ? '' : `${getConfig('minWidth')}px`;

  // make sure the tree view is at the far end of the screen
  var panelContainer = panelView.parentNode;
  if(getConfig('showOnRightSide', 'tree-view'))
    panelContainer.appendChild(panelView);
  else
    panelContainer.insertBefore(panelView, panelContainer.firstChild);
}

var visible = false;

// shows the tree view
export function show(delay = 0, shouldDisableHoverEvents = true) {
  visible = true;
  // disable hover events on the tree view when this
  // show is not triggered by a hover event
  if(shouldDisableHoverEvents && hoverEventsEnabled())
    disposables.add(disableHoverEventsUntilBlur());

  // keep a reference to the currently focused element
  // so we can restore focus when the tree view will hide
  storeFocusedElement();

  // don't resize the tree view if its width is larger
  // than the target width and shrinking is disabled
  var treeViewWidth = Math.max(getContentWidth(), canTreeViewShrink * getTreeViewEl().clientWidth);

  return animate(treeViewWidth, delay).then(hasFinished => {
    // make sure the hover area doesn't block tree items
    hoverArea.style.pointerEvents = 'none';
    // focus the tree view if the animation finished
    if(hasFinished) focusTreeView();
    return hasFinished;
  });
}

// hides the tree view
export function hide(delay = 0) {
  visible = false;
  // enable tree view shrinking
  enableShrinking();
  hoverArea.style.pointerEvents = '';
  return animate(getConfig('minWidth'), delay).then(hasFinished => {
    // focus the element that had focus when show() was triggered
    if(hasFinished) restoreFocus();
    return hasFinished;
  });
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

// temporarily disables shrinking
// width of the tree view
var canTreeViewShrink = true;

function disableShrinking() {
  canTreeViewShrink = false;
}

function enableShrinking() {
  canTreeViewShrink = true;
}

var currentAnimation = null;

// the animation function resolves with 'true' if the
// animation finished, with 'false' if cancelled
function animate(targetWidth, delay, element = getTreeViewEl()) {
  var initialWidth = element.clientWidth;
  // set animationSpeed to Infinity if it equals 0
  var animationSpeed = getConfig('animationSpeed') || Infinity;
  // calculate the animation duration if animationSpeed
  // equals 0 divide by Infinity for a duration of 0
  var duration = Math.abs(targetWidth - initialWidth) / animationSpeed;

  // cancel any current animation and
  // immediately trigger this animation
  if(currentAnimation && currentAnimation.playState != 'finished') {
    currentAnimation.cancel();
    delay = 0;
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
      if(animation.playState != 'finished')
        return void resolve(false);

      // prevent tree view from resetting its width to initialWidth
      element.style.width = `${targetWidth}px`;
      currentAnimation = null;
      resolve(true);
    });
  }).catch(logError);
}
