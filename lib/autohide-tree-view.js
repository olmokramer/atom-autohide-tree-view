'use babel';
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

var disposables, initialized;

function init() {
  if(initialized) return;
  disposables = new SubAtom();
  // wait until the tree view package is activated
  Promise.all([
    atom.packages.activatePackage('tree-view'),
    atom.packages.isPackageLoaded('atom-touch-events') && atom.packages.activatePackage('atom-touch-events')
  ]).then(function([treeViewPkg, atomTouchEventsPkg]) {
    registerTreeView(treeViewPkg);
    handleEvents(!!atomTouchEventsPkg);
    // start with pushEditor = true, we'll change it back later
    return update(true);
  }).then(function() {
    return update();
  }).then(function() {
    initialized = true;
  }).catch(logError);
}

function deinit() {
  if(!initialized) return;
  initialized = false;
  disposables.dispose();
  // the stylesheet will be removed before the animation is finished
  // making it look ugly... set minWidth on the element to prevent this
  treeViewEl.style.minWidth = '1px';
  // update with pushEditor = true for a nicer animation
  update(true).then(function() {
    // show the tree view
    return show();
  }).then(function() {
    // finally dispose of the tree view and reset all used variables
    resetTreeView();
    [
      disposables,
      initialized,
      visible,
      focusedElement,
      hoverEventsEnabled,
      currentAnimation
    ] = [];
  }).catch(logError);
}

var treeView, treeViewEl;

// keep references to the tree view model and element
function registerTreeView(treeViewPkg) {
  treeView = treeViewPkg.mainModule.createView();
  treeViewEl = treeView.element;
  treeViewEl.classList.add('autohide');
}

// reset the styles etc. on the tree view
function resetTreeView() {
  treeViewEl.classList.remove('autohide');
  treeViewEl.style.position = '';
  treeViewEl.style.minWidth = '';
  treeView.scroller[0].style.display = '';
  var panelView = atom.views.getView(treeView.panel);
  if(panelView) {
    panelView.style.width = '';
  }
  [treeView, treeViewEl] = [];
}

function handleEvents(touchEvents) {
  // changes to these settings should trigger an update
  disposables.add(atom.config.onDidChange('autohide-tree-view.pushEditor', update));
  disposables.add(atom.config.onDidChange('autohide-tree-view.hiddenWidth', update));
  disposables.add(atom.config.onDidChange('tree-view.showOnRightSide', update));
  disposables.add(atom.config.onDidChange('tree-view.hideIgnoredNames', update));
  disposables.add(atom.config.onDidChange('tree-view.hideVcsIgnoredFiles', update));
  disposables.add(atom.config.onDidChange('core.ignoredNames', update));

  // changes to the showOn config should enable hover events (the enableHoverEvents
  // function checks if it actually *should* enable hover events)
  disposables.add(atom.config.onDidChange('autohide-tree-view.showOn', enableHoverEvents));

  // add listeners for mouse events
  // show the tree view when it is hovered
  disposables.add(treeViewEl, 'mouseenter', function onMouseEnter() {
    if(hoverEventsEnabled) show(getConfig('showDelay'), false);
  });
  disposables.add(treeViewEl, 'mouseleave', function onMouseLeave() {
    if(hoverEventsEnabled) hide(getConfig('hideDelay'));
  });

  // disable the tree view from showing during text selection
  disposables.add('atom-workspace', 'mousedown', 'atom-text-editor', disableHoverEvents);
  disposables.add('atom-workspace', 'mouseup', 'atom-text-editor', enableHoverEvents);

  // toggle the tree view if it is clicked
  disposables.add(treeViewEl, 'click', function onClick() {
    if(getConfig('showOn').match('click')) toggle();
  });
  disposables.add(treeView.list, 'blur', function onBlur() {
    if(!getConfig('showOn').match('click')) return;
    // clear the focused element so the element the user
    // clicked will get focus
    clearFocusedElement();
    hide();
  });

  // resize the tree view when project.paths changes
  disposables.add(atom.project.onDidChangePaths(resize));

  // add command listeners
  disposables.add(atom.commands.add('atom-workspace', {
    // own commands
    'autohide-tree-view:toggle-push-editor': () => toggleConfig('pushEditor'),
    // core commands
    'tool-panel:unfocus': hide,
    // tree-view commands
    'tree-view:show': function(event) {
      event.stopImmediatePropagation();
      show();
    },
    'tree-view:hide': function(event) {
      event.stopImmediatePropagation();
      hide();
    },
    'tree-view:toggle': function(event) {
      event.stopImmediatePropagation();
      toggle();
    },
    'tree-view:reveal-active-file': show,
    'tree-view:toggle-focus': toggle,
    'tree-view:remove': resize,
    'tree-view:paste': resize,
    'tree-view:expand-directory': resize,
    'tree-view:recursive-expand-directory': resize,
    'tree-view:collapse-directory': resize,
    'tree-view:recursive-collapse-directory': resize
  }));

  // resize the tree view when opening/closing a directory
  disposables.add(treeViewEl, 'click', '.entry.directory', function(event) {
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
    treeViewEl.style.position = pushEditor ? '' : 'absolute';
    var panelView = atom.views.getView(treeView.panel);
    if(panelView) {
      panelView.style.width = pushEditor ? '' : `${getConfig('hiddenWidth')}px`;
    }
  }).then(resize).catch(logError);
}

var visible;

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

// toggles the tree view
function toggle(delay) {
  if(typeof delay != 'number') delay = 0;
  return visible ? hide(delay) : show(delay);
}

// resizes the tree view when its content width might change
function resize() {
  return Promise.resolve().then(function() {
    return visible ? show() : hide();
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

// recovers focus on focusedElement
function restoreFocus() {
  if(!focusedElement) return;
  if(typeof focusedElement.focused === 'function') focusedElement.focused();
  else if(typeof focusedElement.focus === 'function') focusedElement.focus();
  clearFocusedElement();
}

var hoverEventsEnabled;

// enable hover events on the tree view
// (but only if showOn is 'hover' or 'hover + click')
function enableHoverEvents() {
  hoverEventsEnabled = !!getConfig('showOn').match('hover');
}

// disable hover events on the tree view
function disableHoverEvents() {
  hoverEventsEnabled = false;
}

var currentSwipe = null;

function shouldInitSwipe(event, source) {
  // return if autohide or touch events is disabled
  if(!initialized || !getConfig('showOn').match('touch')) return false;
  var pageX = event.touches[0].pageX;
  // always swipe when target is tree view
  if(!isChildOf(source, treeViewEl.parentNode)) {
    // check if in touch area
    if(getConfig('showOnRightSide', 'tree-view')) {
      if(pageX < window.innerWidth - getConfig('touchAreaSize')) return false;
    } else {
      if(pageX > getConfig('touchAreaSize')) return false;
    }
  }
  currentSwipe = event;
  return true;
}

// triggered while swiping the tree view
function swipeChange({args: event, source, deltaX}) {
  // check if swipe should show the tree view
  if(!currentSwipe && !shouldInitSwipe(event, source)) return;
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
  if(!currentSwipe) return;
  currentSwipe = null;
  if(getConfig('showOnRightSide', 'tree-view')) show();
  else hide();
}

// triggered after swipe right
function swipeEndRight() {
  if(!currentSwipe) return;
  currentSwipe = null;
  if(getConfig('showOnRightSide', 'tree-view')) hide();
  else show();
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
      if(animation.playState != 'finished') {
        resolve(false);
        return;
      }
      // prevent tree view from resetting its width to initialWidth
      treeViewEl.style.width = `${targetWidth}px`;
      // reset the currentAnimation reference
      currentAnimation = null;
      resolve(true);
    });
  }).catch(logError);
}

// public API

const config = {
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
    minimum: 1,
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
  touchAreaSize: {
    description: 'Width of the area at the edges of the screen where the tree view touch events will be triggered.',
    type: 'integer',
    default: 50,
    order: 6
  }
};

var disposables2;

function activate() {
  disposables2 = new SubAtom();

  // these commands are handled here, because we don't want to dispose them on deinit()
  disposables2.add(atom.commands.add('atom-workspace', {
    'autohide-tree-view:enable': init,
    'autohide-tree-view:disable': deinit
  }));
}

function deactivate() {
  disposables2.dispose();
  deinit();
}

// provide service for other packages to
function provideService() {
  return { show, hide, enable: init, disable: deinit };
}

function consumeTouchSwipeLeftService(onDidTouchSwipeLeft) {
  disposables2.add(onDidTouchSwipeLeft(swipeChange, swipeEndLeft));
}

function consumeTouchSwipeRightService(onDidTouchSwipeRight) {
  disposables2.add(onDidTouchSwipeRight(swipeChange, swipeEndRight));
}

export {config, activate, deactivate, provideService, consumeTouchSwipeLeftService, consumeTouchSwipeRightService};
