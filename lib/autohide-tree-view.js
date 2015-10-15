'use babel';
import 'object-assign-shim';
import {CompositeDisposable, Disposable} from 'atom';
import initCommands from './commands.js';
import {disableHoverEvents, isHoverEventsEnabled,
  disableHoverEventsUntilBlur} from './hover-events.js';
import {disableClickEvents} from './click-events.js';
import {disableTouchEvents} from './touch-events.js';
import pinView from './pin-view.js';
import config, {observeConfig} from './config.js';
import {logError, getTreeView, getTreeViewEl, getContentWidth,
  isChildOf, addDelegatedEventListener} from './utils.js';

function asyncResolve() {
  return new Promise(resolve => process.nextTick(resolve));
}

var enabled = false;

export function enableAutohide() {
  if(enabled) return asyncResolve();
  enabled = true;
  visible = false;

  getTreeViewEl().setAttribute('data-autohide', '');

  handleEvents();
  pinView.deactivate();
  getTreeViewEl().appendChild(eventTriggerArea);

  // start with pushEditor = true for a nicer animation
  return updateTreeView(true).then(() => updateTreeView()).catch(logError);
}

export function disableAutohide() {
  if(!enabled) return asyncResolve();
  enabled = false;

  pinView.activate();
  disposables.dispose();
  disposables = null;

  var treeViewEl = getTreeViewEl();
  // the stylesheet will be removed before the animation is finished
  // which will reset the minWidth to 100px
  treeViewEl.style.minWidth = '0px';
  // animation is messed up if tree view is visible AND pushEditor is true
  return updateTreeView(!isTreeViewVisible()).then(() => showTreeView()).then(() => {
    // animate the panel if the tree view is already visible
    if(isTreeViewVisible()) return animate(treeViewEl.clientWidth, 0, treeViewEl.parentNode);
  }).then(() => {
    // reset styles and attributes on the tree view
    treeViewEl.removeAttribute('data-autohide');
    Object.assign(treeViewEl.style, {position: '', height: '', minWidth: ''});
    var panelView = atom.views.getView(getTreeView().panel);
    if(panelView) panelView.style.width = '';
  }).catch(logError);
}

export function isAutohideEnabled() {
  return enabled;
}

export function toggleAutohide() {
  return enabled ? disableAutohide() : enableAutohide();
}

var disposables;

function handleEvents() {
  var treeViewEl = getTreeViewEl();

  disposables = new CompositeDisposable();
  disposables.add(
    initCommands(),
    observeConfig(),

    addDelegatedEventListener(treeViewEl, 'click', '.entry.directory', event => {
      if(event.button == 0) resizeTreeView();
    }),

    addDelegatedEventListener(treeViewEl, 'click', '.entry.file', event => {
      if(event.button == 0) var disposable = atom.workspace.onDidChangeActivePaneItem(paneItem => {
        storeFocusedElement(atom.views.getView(paneItem));
        disposable.dispose();
      });
    }),

    addDelegatedEventListener(document.body, 'focus', 'atom-text-editor', () => {
      if(isTreeViewVisible()) hideTreeView();
    }),

    new Disposable(() => {
      disableHoverEvents();
      disableClickEvents();
      disableTouchEvents();
    }),
  );
}

export function updateTreeView(pushEditor = config.pushEditor) {
  return asyncResolve().then(() => {
    getTreeViewEl().style.position = pushEditor ? '' : 'absolute';

    var panel = atom.views.getView(getTreeView().panel);
    if(!panel) return;
    panel.style.width = pushEditor ? '' : `${config.minWidth}px`;
    if(config.showOnRightSide)
      panel.parentNode.appendChild(panel);
    else
      panel.parentNode.insertBefore(panel, panel.parentNode.firstChild);
  }).then(resizeTreeView).catch(logError);
}

// area on which hover and click events trigger
export var eventTriggerArea = document.createElement('div');
eventTriggerArea.classList.add('tree-view-autohide-trigger-area');

export function updateTriggerArea() {
  var triggerWidth = Math.max(1, config.minWidth, config.triggerAreaSize);
  eventTriggerArea.style.minWidth = `${triggerWidth}px`;
}

var visible = false;

// shows the tree view
export function showTreeView(delay = 0, shouldDisableHoverEvents = true) {
  visible = true;
  // disable hover events on the tree view when this
  // show is not triggered by a hover event
  if(shouldDisableHoverEvents && isHoverEventsEnabled())
    disposables.add(disableHoverEventsUntilBlur());

  // keep a reference to the currently focused element
  // so we can restore focus when the tree view will hide
  storeFocusedElement();

  return animate(getContentWidth(), delay).then(hasFinished => {
    // make sure the hover area doesn't block tree items
    eventTriggerArea.style.pointerEvents = 'none';
    // focus the tree view if the animation finished
    if(hasFinished) focusTreeView();
    return hasFinished;
  });
}

// hides the tree view
export function hideTreeView(delay = 0) {
  visible = false;
  eventTriggerArea.style.pointerEvents = '';
  return animate(config.minWidth, delay).then(hasFinished => {
    // focus the element that had focus when show() was triggered
    if(hasFinished) restoreFocus();
    return hasFinished;
  });
}

export function isTreeViewVisible() {
  return visible;
}

// toggles the tree view
export function toggleTreeView(delay = 0) {
  return visible ? hideTreeView(delay) : showTreeView(delay);
}

// resizes the tree view to fit the content
export function resizeTreeView() {
  return asyncResolve().then(() =>
    visible ? showTreeView(0, false) : hideTreeView()
  );
}

var currentAnimation = null;

// the animation function resolves with 'true' if the
// animation finished, or with 'false' if it was cancelled
function animate(targetWidth, delay, element = getTreeViewEl()) {
  var initialWidth = element.clientWidth;
  // duration = 0 if animationSpeed == 0
  var animationSpeed = config.animationSpeed || Infinity;
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

// functions that deal with focusing the right
// element at the right time

var focusedElement;

// cache the element that currently has focus
export function storeFocusedElement(el = document.activeElement) {
  if(!isChildOf(el, getTreeViewEl().parentNode))
    focusedElement = el;
}

// clear the reference to the focusedElement. useful
// when we want to invalidate the next restoreFocus
export function clearFocusedElement() {
  focusedElement = null;
}

// restores focus on focusedElement
export function restoreFocus() {
  // only restore focus if tree view has focus
  if(!focusedElement || !isChildOf(document.activeElement, getTreeViewEl()))
    return;
  if(typeof focusedElement.focus == 'function')
    focusedElement.focus();
  clearFocusedElement();
}

// focus the tree view with some logic around it to cancel
export function focusTreeView() {
  // don't focus if a modal panel has focus
  // because they tend to close when they lose focus
  if(isChildOf(document.activeElement, 'atom-panel.modal'))
    return;

  getTreeView().focus();
}
