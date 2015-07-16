'use babel';
import 'object-assign-shim';
import SubAtom from 'sub-atom';

// some generic functions
function logError(error) {
  console.error(error.message);
}

function getConfig(key, ns = 'autohide-tree-view') {
  return atom.config.get(`${ns}.${key}`);
}

function setConfig(key, value, ns = 'autohide-tree-view') {
  atom.config.set(`${ns}.${key}`, value);
}

function toggleConfig(key, ns) {
  setConfig(key, !getConfig(key, ns), ns);
}

function isChildOf(childNode, parentNode) {
  while(childNode != parentNode && childNode != document.body) {
    childNode = childNode.parentNode;
  }
  return childNode == parentNode;
}

// private API

var enabled = false;

function isEnabled() {
  return enabled;
}

function enable() {
  if(enabled) return;
  enabled = true;
  // check if the tree view package is loaded and
  // wait until the tree view package is activated
  Promise.resolve(
    atom.packages.isPackageLoaded('tree-view') &&
    atom.packages.activatePackage('tree-view')
  ).then(function(treeViewPkg) {
    if(!treeViewPkg) return;
    registerTreeView(treeViewPkg);
    createHoverElement();
    handleEvents();
    // start with pushEditor = true, we'll change it back later
    return update(true);
  }).then(update).catch(logError);
}

function disable() {
  if(!enabled) return;
  enabled = false;
  enabledDisposable.dispose();
  // the stylesheet will be removed before the animation is finished
  // which will reset the minWidth to 100px... it looks ugly, so set
  // minWidth on the element to prevent this
  treeViewEl.style.minWidth = '1px';
  // update with pushEditor = true for a nicer animation
  // then show the tree view
  update(true).then(show).then(function() {
    // finally dispose of the tree view and reset all variables
    unregisterTreeView();
    visible = false;
    [ enabledDisposable, focusedElement,
      currentSwipeEvent, currentAnimation ] = [];
  }).catch(logError);
}

var treeView, treeViewEl;

// keep references to the tree view model and element
function registerTreeView(treeViewPkg) {
  treeView = treeViewPkg.mainModule.createView();
  treeViewEl = treeView.element;
  treeViewEl.setAttribute('data-autohide', '');
}

// remove the styles etc. on the tree view
function unregisterTreeView() {
  treeViewEl.removeAttribute('data-autohide');
  Object.assign(treeViewEl.style, {
    position: '',
    height: '',
    width: '',
    minWidth: ''
  });
  treeView.scroller[0].style.display = '';
  var panelView = atom.views.getView(treeView.panel);
  if(panelView) panelView.style.width = '';
  destroyHoverElement();
  [ treeView, treeViewEl ] = [];
}

var hoverElement;

function createHoverElement() {
  hoverElement = document.createElement('div');
  hoverElement.classList.add('tree-view-hover-handle');
  updateHoverElement();
  treeViewEl.appendChild(hoverElement);
}

function destroyHoverElement() {
  treeViewEl.removeChild(hoverElement);
  hoverElement = null;
}

function updateHoverElement() {
  var hoverWidth = getConfig('hoverAreaSize');
  var hiddenWidth = getConfig('hiddenWidth');
  hoverWidth = Math.max(1, hoverWidth, hiddenWidth);
  Object.assign(hoverElement.style, {
    width: `${hoverWidth}px`,
    // align with the left edge of the window
    margin: `0 -${hiddenWidth}px`
  });
}

var enabledDisposable;

function handleEvents() {
  enabledDisposable = new SubAtom(
    // changes to these settings should trigger an update
    atom.config.onDidChange('autohide-tree-view.pushEditor', update),
    atom.config.onDidChange('autohide-tree-view.hiddenWidth', update),
    atom.config.onDidChange('tree-view.showOnRightSide', update),
    atom.config.onDidChange('tree-view.hideIgnoredNames', update),
    atom.config.onDidChange('tree-view.hideVcsIgnoredFiles', update),
    atom.config.onDidChange('core.ignoredNames', update),

    // update the width of the hover element
    atom.config.onDidChange('autohide-tree-view.hoverAreaSize', updateHoverElement),
    atom.config.onDidChange('autohide-tree-view.hiddenWidth', updateHoverElement),

    // changes to the showOn config should enable hover events (the enableHoverEvents
    // function checks if it actually *should* enable hover events)
    atom.config.onDidChange('autohide-tree-view.showOn', enableHoverEvents),

    // resize the tree view when project.paths changes
    atom.project.onDidChangePaths(resize),

    // add command listeners
    atom.commands.add('atom-workspace', {
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
      'tree-view-finder:toggle': () => resize().then(show)
    })
  );

  // add listeners for mouse events
  // show the tree view when it is hovered
  enabledDisposable.add('.tree-view-resizer .tree-view-hover-handle', 'mouseenter', function onMouseEnter() {
    if(hoverEventsEnabled) show(getConfig('showDelay'), false);
  }),
  enabledDisposable.add(treeViewEl, 'mouseleave', function onMouseLeave() {
    if(hoverEventsEnabled) hide(getConfig('hideDelay'));
  }),

  // disable the tree view from showing during text selection
  enabledDisposable.add('atom-workspace', 'mousedown', 'atom-text-editor', disableHoverEvents);
  enabledDisposable.add('atom-workspace', 'mouseup', 'atom-text-editor', enableHoverEvents);


  // toggle the tree view if it is clicked
  enabledDisposable.add(treeViewEl, 'click', function onClick() {
    if(getConfig('showOn').match('click')) toggle();
  });
  enabledDisposable.add(treeView.list, 'blur', function onBlur() {
    if(hoverEventsEnabled) return;
    // clear the focused element so the element the user
    // clicked will get focus
    clearFocusedElement();
    hide();
  });

  // resize the tree view when opening/closing a directory
  enabledDisposable.add(treeViewEl, 'click', '.entry.directory', function(event) {
    event.stopPropagation();
    resize();
  });

  // hide the tree view when a file is opened by a command
  for(let direction of ['', '-right', '-left', '-up', '-down']) {
    enabledDisposable.add(atom.commands.add('atom-workspace', `tree-view:open-selected-entry${direction}`, hide));
  }

  for(let i of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    enabledDisposable.add(atom.commands.add('atom-workspace', `tree-view:open-selected-entry-in-pane-${i}`, hide));
  }

  // these commands create a dialog that should keep focus
  // when the tree view hides
  for(let command of ['add-file', 'add-folder', 'duplicate', 'rename', 'move']) {
    enabledDisposable.add(atom.commands.add('atom-workspace', `tree-view:${command}`, clearFocusedElement));
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
  Object.assign(treeViewEl.style, {
    position: pushEditor ? '' : 'absolute',
    height: !pushEditor && statusBarEl ? `calc(100% - ${statusBarEl.clientHeight}px)` : ''
  });
}

function updatePanel(pushEditor) {
  var panelView = atom.views.getView(treeView.panel);
  if(!panelView) return; // tree view not attached
  panelView.style.width = pushEditor ? '' : `${getConfig('hiddenWidth')}px`;
  // make sure the tree view is at the far end of the screen
  if(getConfig('showOnRightSide', 'tree-view')) {
    panelView.parentNode.appendChild(panelView);
  } else {
    panelView.parentNode.insertBefore(panelView, panelView.parentNode.firstChild);
  }
}

var visible = false;

function isVisible() {
  return visible;
}

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
  // show the tree view content
  treeView.scroller[0].style.display = '';
  return animate(treeView.list[0].clientWidth, delay).then(function(finished) {
    // focus the tree view if the animation
    // finished (i.e. wasn't cancelled)
    if(finished) treeView.focus();
  });
}

// hides the tree view
function hide(delay) {
  if(typeof delay != 'number') delay = 0;
  visible = false;
  // enable hover events
  enableHoverEvents();
  // focus the element that had focus when show() was triggered
  restoreFocus();
  return animate(getConfig('hiddenWidth'), delay).then(function(finished) {
    // hide the tree view content
    if(finished) treeView.scroller[0].style.display = 'none';
  });
}

var currentAnimation = null;

// the animation function resolves with 'true' if the
// animation finished, with 'false' if cancelled
function animate(targetWidth, delay) {
  // get the initial width of the element
  var initialWidth = treeViewEl.clientWidth;
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

  return new Promise(function(resolve) {
    // check if animation necessary
    if(duration == 0) return void setTimeout(function() {
      treeViewEl.style.width = `${targetWidth}px`;
      resolve(true);
    }, delay);

    // cache the current animationPlayer so we can
    // cancel it as soon as another animation begins
    var animation = currentAnimation = treeViewEl.animate([
      {width: initialWidth}, {width: targetWidth}
    ], {duration, delay});

    animation.addEventListener('finish', function finish() {
      animation.removeEventListener('finish', finish);
      // if cancelled, resolve with false
      if(animation.playState != 'finished') return void resolve(false);
      // prevent tree view from resetting its width to initialWidth
      treeViewEl.style.width = `${targetWidth}px`;
      // reset the currentAnimation reference
      currentAnimation = null;
      resolve(true);
    });
  }).catch(logError);
}

// toggles the tree view
function toggle(delay) {
  if(typeof delay != 'number') delay = 0;
  return visible ? hide(delay) : show(delay);
}

// resizes the tree view to fit the content
function resize() {
  return Promise.resolve().then(function() {
    return visible ? show(0, false) : hide();
  });
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

var hoverEventsEnabled;

// enable hover events on the tree view
// only if showOn contains 'hover'
function enableHoverEvents() {
  hoverEventsEnabled = !!getConfig('showOn').match('hover');
}

// disable hover events on the tree view
function disableHoverEvents() {
  hoverEventsEnabled = false;
}

function revealActiveFile() {
  process.nextTick(function() {
    show().then(function() {
      treeView.scroller[0].style.display = '';
      treeView.scrollToEntry(treeView.getSelectedEntries()[0]);
    })
  });
}

// swipe event handlers

var currentSwipeEvent = null;

function shouldInitSwipe(event, source) {
  // false if autohide or touch events is disabled
  if(!enabled || !getConfig('showOn').match('touch')) return false;
  var { pageX } = event.touches[0];
  // always swipe when target is tree view
  if(!isChildOf(source, treeViewEl.parentNode)) {
    // check if in touch area
    if(getConfig('showOnRightSide', 'tree-view')) {
      if(pageX < window.innerWidth - getConfig('touchAreaSize')) return false;
    } else {
      if(pageX > getConfig('touchAreaSize')) return false;
    }
  }
  currentSwipeEvent = event;
  return true;
}

// triggered while swiping the tree view
function swipeChange({ args: event, source, deltaX }) {
  // check if swipe should show the tree view
  if(!currentSwipeEvent && !shouldInitSwipe(event, source)) return;
  // show tree view contents
  treeView.scroller[0].style.display = 'block';
  // calculate new tree view width
  if(getConfig('showOnRightSide', 'tree-view')) deltaX *= -1
  var newWidth = treeViewEl.clientWidth + deltaX;
  newWidth = Math.max(getConfig('hiddenWidth'), newWidth);
  newWidth = Math.min(treeView.list[0].clientWidth, newWidth);
  // request the frame
  requestAnimationFrame(function frame() {
    treeViewEl.style.width = `${newWidth}px`;
  });
}

// triggered after swipe left
function swipeEndLeft() {
  if(!currentSwipeEvent) return;
  currentSwipeEvent = null;
  getConfig('showOnRightSide', 'tree-view') ? show() : hide();
}

// triggered after swipe right
function swipeEndRight() {
  if(!currentSwipeEvent) return;
  currentSwipeEvent = null;
  getConfig('showOnRightSide', 'tree-view') ? hide() : show();
}

function onDidResizeWindow(maxWindowWidth) {
  if(typeof maxWindowWidth != 'number') maxWindowWidth = getConfig('maxWindowWidth');
  maxWindowWidth == 0 || window.innerWidth < maxWindowWidth ? enable() : disable();
}

// public API

export const config = {
  showOn: {
    description: 'The type of event that triggers the tree view to show or hide. The touch events require atom-touch-events (https://atom.io/packages/atom-touch-events) to be installed. You\'ll need to restart this package after installing atom-touch-events for touch events to become available.',
    type: 'string',
    default: 'hover + touch',
    enum: [
      'hover',
      'click',
      'touch',
      'hover + click',
      'hover + touch',
      'click + touch',
      'hover + click + touch',
      'none'
    ],
    order: 0
  },
  showDelay: {
    description: 'The delay in milliseconds before the tree view will show. Only applies to hover events.',
    type: 'integer',
    default: 200,
    minimum: 0,
    order: 1
  },
  hideDelay: {
    description: 'The delay in milliseconds before the tree view will hide. Only applies to hover events.',
    type: 'integer',
    default: 200,
    minimum: 0,
    order: 2
  },
  hiddenWidth: {
    description: 'The width in pixels of the tree view when it is hidden.',
    type: 'integer',
    default: 5,
    minimum: 0,
    order: 3
  },
  animationSpeed: {
    description: 'The speed in 1000 pixels per second of the animation. Set to 0 to disable the animation.',
    type: 'number',
    default: 1,
    minimum: 0,
    order: 4
  },
  pushEditor: {
    description: 'Push the edge of the editor around to keep the entire editor contents visible.',
    type: 'boolean',
    default: false,
    order: 5
  },
  hoverAreaSize: {
    descriptionN: 'Width of an invisible area at the edge of the screen where hover events will be triggered. When smaller than the value of the hiddenWidth setting, hiddenWidth will be used.',
    type: 'integer',
    default: 0,
    minimum: 0,
    order: 6
  },
  touchAreaSize: {
    description: 'Width of an invisible area at the edge of the screen where touch events will be triggered.',
    type: 'integer',
    default: 50,
    minimum: 0,
    order: 7
  },
  maxWindowWidth: {
    description: 'Autohide will be disabled when the window is wider than this. Set to 0 to always enable autohide.',
    type: 'integer',
    default: 0,
    minimum: 0,
    order: 8
  },
  disableRevealActiveFile: {
    description: 'Disable showing the tree view on '
  }
};

var disposable;

export function activate() {
  disposable = new SubAtom(
    // these commands are handled here, because we don't want to dispose them on disable()
    atom.commands.add('atom-workspace', {
      'autohide-tree-view:enable': enable,
      'autohide-tree-view:disable': disable,
      'autohide-tree-view:toggle-enabled': () => enabled ? disable() : enable()
    }),

    atom.config.observe('autohide-tree-view.maxWindowWidth', onDidResizeWindow)
  );

  disposable.add(window, 'resize', onDidResizeWindow);
}

export function deactivate() {
  disposable.dispose();
  disable();
}

// provide service for other packages to control the tree view
export function provideService() {
  return { show, hide, enable, disable };
}

export function provideServiceV2() {
  return { isVisible, show, hide, isEnabled, enable, disable };
}

export function consumeTouchSwipeLeftService(onDidTouchSwipeLeft) {
  disposable.add(onDidTouchSwipeLeft(swipeChange, swipeEndLeft));
}

export function consumeTouchSwipeRightService(onDidTouchSwipeRight) {
  disposable.add(onDidTouchSwipeRight(swipeChange, swipeEndRight));
}
