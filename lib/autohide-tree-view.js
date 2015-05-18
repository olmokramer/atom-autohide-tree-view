'use babel';

// used variables
var SubAtom, disposables, onTouchSwipeLeft, onTouchSwipeRight, initialized, visible, treeView, treeViewEl, focusedElement, hoverEventsEnabled, currentAnimation;

initialized = false;

// some generic functions
function logError(error) {
  console.error(error.message)
}

function getConfig(key) {
  return atom.config.get(`autohide-tree-view.${key}`);
}

function setConfig(key, value) {
  atom.config.set(`autohide-tree-view.${key}`, value);
}

function toggleConfig(key) {
  setConfig(key, !getConfig(key));
}

// private API

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
    return show(0);
  }).then(function() {
    // finally dispose of the tree view and reset all used variables
    resetTreeView();
    [disposables, treeView, treeViewEl, visible, focusedElement, hoverEventsEnabled, currentAnimation] = [];
  }).catch(logError);
}

// keep references to the tree view model and element
function registerTreeView(treeViewPkg) {
  treeView = treeViewPkg.mainModule.createView();
  treeViewEl = treeView.element;
  treeViewEl.classList.add('autohide');
}

// reset the styles etc. on the tree view
function resetTreeView() {
  var panelView;
  treeViewEl.classList.remove('autohide');
  treeViewEl.style.position = '';
  treeViewEl.style.minWidth = '';
  treeView.scroller[0].style.display = '';
  panelView = atom.views.getView(treeView.panel);
  if(panelView) {
    panelView.style.width = '';
  }
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
  disposables.add(treeViewEl, 'mouseenter', mouseenter);
  disposables.add(treeViewEl, 'mouseleave', mouseleave);
  // disable the tree view from showing during text selection
  disposables.add('atom-workspace', 'mousedown', 'atom-text-editor', disableHoverEvents);
  disposables.add('atom-workspace', 'mouseup', 'atom-text-editor', enableHoverEvents);
  // toggle the tree view if it is clicked
  disposables.add(treeViewEl, 'click', click);
  disposables.add(treeView.list, 'blur', blur);

  // add support for touch events if the atom-touch-events
  // package is enabled
  if(touchEvents) {
    disposables.add(onTouchSwipeLeft(swipeLeftStart, swipeLeftEnd));
    disposables.add(onTouchSwipeRight(swipeRightStart, swipeRightEnd));
  }

  // resize the tree view when project.paths changes
  disposables.add(atom.project.onDidChangePaths(resize));

  // add command listeners
  disposables.add(atom.commands.add('atom-workspace', {
    // own commands
    'autohide-tree-view:toggle-push-editor': function() {
      toggleConfig('pushEditor');
    },
    // core commands
    'tool-panel:unfocus': function() {
      hide(0);
    },
    // tree-view commands
    'tree-view:show': function(event) {
      event.stopImmediatePropagation();
      show(0, true);
    },
    'tree-view:hide': function(event) {
      event.stopImmediatePropagation();
      hide(0);
    },
    'tree-view:toggle': function(event) {
      event.stopImmediatePropagation();
      toggle();
    },
    'tree-view:reveal-active-file': function() {
      show(0, true);
    },
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
  for(var direction of ['', '-right', '-left', '-up', '-down']) {
    disposables.add(atom.commands.add('atom-workspace', `tree-view:open-selected-entry${direction}`, function() {
      hide(0);
    }));
  }

  for(var i of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    disposables.add(atom.commands.add('atom-workspace', `tree-view:open-selected-entry-in-pane-${i}`, function() {
      hide(0);
    }));
  }

  // these commands create a dialog that should keep focus
  // when the tree view hides
  for(var command of ['add-file', 'add-folder', 'duplicate', 'rename', 'move']) {
    disposables.add(atom.commands.add('atom-workspace', `tree-view:${command}`, clearFocusedElement));
  }
}

// updates styling on the .tree-view-resizer and the panel (container)
function update(pushEditor) {
  if(typeof pushEditor !== 'boolean') pushEditor = getConfig('pushEditor');
  return Promise.resolve().then(function() {
    var panelView;
    treeViewEl.style.position = pushEditor ? '' : 'absolute';
    if(panelView = atom.views.getView(treeView.panel)) {
      panelView.style.width = pushEditor ? '' : `${getConfig('hiddenWidth')}px`;
    }
  }).then(resize).catch(logError);
}

// shows the tree view
function show(delay = getConfig('showDelay'), shouldDisableHoverEvents = false) {
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
function hide(delay = getConfig('hideDelay')) {
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
function toggle() {
  return visible ? hide(0) : show(0, true);
}

// resizes the tree view when its content width might change
function resize() {
  return Promise.resolve().then(function() {
    return visible ? show(0) : hide(0);
  });
}

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

// enable hover events on the tree view
// (but only if showOn is 'hover' or 'hover + click')
function enableHoverEvents() {
  hoverEventsEnabled = !!getConfig('showOn').match('hover');
}

// disable hover events on the tree view
function disableHoverEvents() {
  hoverEventsEnabled = false;
}

// fired when the mouse enters the tree view
function mouseenter() {
  if(hoverEventsEnabled) show();
}

// fired when the mouse leaves the tree view
function mouseleave() {
  if(hoverEventsEnabled) hide();
}

// fired when the tree view is clicked
function click() {
  var showOn = getConfig('showOn');
  if(showOn.match('click')) toggle();
}

// fired when the tree view is blurred
function blur() {
  if(!getConfig('showOn').match(/(click|touch)/)) return;
  // clear the focused element so the element the user
  // clicked will be focused instead
  clearFocusedElement();
  hide(0);
}

function isTreeView(target) {
  while(target != treeViewEl.parentNode && target != document.body) {
    target = target.parentNode;
  }
  return target == treeViewEl.parentNode;
}

function swipeLeftStart({source, deltaX}) {
  if(!getConfig('showOn').match('touch') || !isTreeView(source)) return;
  treeView.scroller[0].style.display = 'block'
  if(atom.config.get('tree-view.showOnRightSide')) {
    swipeShow(-deltaX);
  } else {
    swipeHide(deltaX);
  }
}

function swipeLeftEnd({source}) {
  if(!getConfig('showOn').match('touch') || !isTreeView(source)) return;
  if(atom.config.get('tree-view.showOnRightSide')) {
    show(0);
  } else {
    hide(0);
  }
}

function swipeRightStart({source, deltaX}) {
  if(!getConfig('showOn').match('touch') || !isTreeView(source)) return;
  treeView.scroller[0].style.display = 'block'
  if(atom.config.get('tree-view.showOnRightSide')) {
    swipeHide(-deltaX);
  } else {
    swipeShow(deltaX);
  }
}

function swipeRightEnd({source}) {
  if(!getConfig('showOn').match('touch') || !isTreeView(source)) return;
  if(atom.config.get('tree-view.showOnRightSide')) {
    hide(0);
  } else {
    show(0);
  }
}

function swipeShow(deltaX) {
  newWidth = Math.min(treeView.list[0].clientWidth, treeViewEl.clientWidth + deltaX);
  requestAnimationFrame(function resizer() {
    treeViewEl.style.width = `${newWidth}px`;
  });
}

function swipeHide(deltaX) {
  newWidth = Math.max(getConfig('hiddenWidth'), treeViewEl.clientWidth + deltaX);
  requestAnimationFrame(function resizer() {
    treeViewEl.style.width = `${newWidth}px`;
  });
}

// the animation function resolves with 'true' if the
// animation finished, with 'false' if cancelled
function animate(targetWidth, delay) {
  var initialWidth, animationSpeed, duration;
  // get the initial width of the element
  initialWidth = treeViewEl.clientWidth;
  // set animationSpeed to Infinity if it equals 0
  animationSpeed = getConfig('animationSpeed') || Infinity;
  // calculate the animation duration if animationSpeed
  // equals 0 divide by Infinity for a duration of 0
  duration = Math.abs(targetWidth - initialWidth) / animationSpeed;

  // cancel any current animation
  if(currentAnimation && currentAnimation.playState !== 'finished') {
    currentAnimation.cancel();
    delay = 0; // immediately trigger the next animation
  }

  return new Promise(function(resolve) {
    var animation;
    // check if animation necessary
    if(duration === 0) return void setTimeout(function() {
      treeViewEl.style.width = `${targetWidth}px`;
      resolve(true);
    }, delay);

    // cache the current animationPlayer so we can
    // cancel it as soon as another animation begins
    animation = currentAnimation = treeViewEl.animate([
      {width: initialWidth}, {width: targetWidth}
    ], {duration, delay});

    animation.addEventListener('finish', function finish() {
      animation.removeEventListener('finish', finish);
      // if cancelled, resolve with false
      if(animation.playState !== 'finished') return resolve(false);
      // prevent tree view from resetting its width to initialWidth
      treeViewEl.style.width = `${targetWidth}px`;
      // reset the currentAnimation reference
      currentAnimation = null;
      resolve(true);
    });
  }).catch(logError);
}

// public API

module.exports = {
  config: {
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
    }
  },

  activate: function activate() {
    if(!SubAtom) SubAtom = require('sub-atom');
    init();

    // these commands are handled here, because we don't want to dispose them on deinit()
    this.commands = atom.commands.add('atom-workspace', {
      'autohide-tree-view:enable': init,
      'autohide-tree-view:disable': deinit
    });
  },

  deactivate: function deactivate() {
    this.commands.dispose();
    deinit();
  },

  // provide service for other packages to
  provideService: function provideService() {
    return {
      show: function(delay, shouldDisableHoverEvents) {
        return show(delay, shouldDisableHoverEvents);
      },
      hide: function(delay) {
        return hide(delay);
      },
      enable: function() {
        return init();
      },
      disable: function() {
        return deinit();
      }
    }
  },

  consumeTouchSwipeLeftService: function consumeTouchSwipeLeftService(onDidTouchSwipeLeft) {
    onTouchSwipeLeft = onDidTouchSwipeLeft;
  },

  consumeTouchSwipeRightService: function consumeTouchSwipeRightService(onDidTouchSwipeRight) {
    onTouchSwipeRight = onDidTouchSwipeRight;
  }
};
