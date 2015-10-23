'use babel';
import 'object-assign-shim';
import {CompositeDisposable, Disposable} from 'atom';
import {treeView, treeViewEl} from './main.js';
import initCommands from './commands.js';
import {disableHoverEvents, isHoverEventsEnabled,
  disableHoverEventsUntilBlur} from './hover-events.js';
import {disableClickEvents} from './click-events.js';
import {disableTouchEvents} from './touch-events.js';
import pinView from './pin-view.js';
import config, {observeConfig} from './config.js';
import {getContentWidth, isChildOf, domListener} from './utils.js';

function logError(error) {
  atom.notifications.addError(`autohide-tree-view: ${error.message}`);
  console.error(error); // eslint-disable-line no-console
}

var disposables;

export function enableAutohide() {
  if(disposables) return Promise.resolve();
  treeViewEl.setAttribute('data-autohide', '');
  treeViewEl.appendChild(eventTriggerArea);
  pinView.deactivate();
  // start with pushEditor = true for a nicer animation
  updateTreeView(true);
  hideTreeView().then(() => {
    updateTreeView();
    handleEvents();
  }, logError);
}

export function disableAutohide() {
  if(!disposables) return Promise.resolve();
  disposables.dispose();
  disposables = null;
  // the stylesheet will be removed before the animation is finished
  // which will reset the minWidth to 100px
  treeViewEl.style.minWidth = '0px';
  var isVisible = isTreeViewVisible();
  var panel = atom.views.getView(treeView.panel);
  updateTreeView(config.pushEditor || !isVisible);
  return (isVisible ? animate(treeViewEl.clientWidth, 0, panel) : showTreeView()).then(() => {
    treeViewEl.removeAttribute('data-autohide');
    Object.assign(treeViewEl.style, {position: '', height: '', minWidth: ''});
    panel.style.width = '';
  }, logError);
}

export function isAutohideEnabled() {
  return !!disposables;
}

export function toggleAutohide() {
  return !!disposables ? disableAutohide() : enableAutohide();
}

function handleEvents() {
  disposables = new CompositeDisposable(
    initCommands(),
    observeConfig(),

    domListener(treeViewEl, 'click', event => {
      if(event.button == 0) resizeTreeView();
    }, {delegationTarget: '.entry.directory'}),

    domListener(treeViewEl, 'click', event => {
      if(event.button == 0) var disposable = atom.workspace.onDidChangeActivePaneItem(paneItem => {
        storeFocusedElement(atom.views.getView(paneItem));
        disposable.dispose();
      });
    }, {useCapture: true, delegationTarget: '.entry.file'}),

    domListener(document.body, 'focus', () => {
      if(isTreeViewVisible()) hideTreeView();
    }, {delegationTarget: 'atom-text-editor'}),

    new Disposable(() => {
      disableHoverEvents();
      disableClickEvents();
      disableTouchEvents();
      pinView.activate();
    }),
  );
}

export function updateTreeView(pushEditor = config.pushEditor) {
  var panel = atom.views.getView(treeView.panel);
  treeViewEl.style.position = pushEditor ? '' : 'absolute';
  panel.style.width = pushEditor ? '' : `${config.minWidth}px`;
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
    if(hasFinished) {
      // focus the element that had focus when show() was triggered
      restoreFocus();
      // again because sometimes a show() ends after a hide() starts
      eventTriggerArea.style.pointerEvents = '';
    }
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
  return visible ? showTreeView(0, false) : hideTreeView();
}

var currentAnimation = null;

// the animation function returns a promise that resolves with 'true'
// if the animation finished, or with 'false' if it was cancelled
function animate(targetWidth, delay, element = treeViewEl) {
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

    animation.addEventListener('finish', function onfinish() {
      animation.removeEventListener('finish', onfinish);
      // if cancelled, resolve with false
      if(animation.playState != 'finished')
        return resolve(false);

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
  if(!isChildOf(el, treeViewEl.parentNode))
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
  if(!focusedElement || !isChildOf(document.activeElement, treeViewEl))
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

  treeView.focus();
}
