'use babel';
import 'array.from';

import SubAtom from 'sub-atom';

import {
  isEnabled as autohideEnabled,
  show as showTreeView,
  hide as hideTreeView,
} from './autohide-tree-view.js';

import {
  getConfig,
} from './config.js';

import {
  getTreeViewEl,
  getContentWidth,
  isChildOf,
} from './utils.js';

var onDidTouchSwipeLeft;
var onDidTouchSwipeRight;

export function consumeTouchSwipeLeftService(onDidTouchSwipeLeftService) {
  onDidTouchSwipeLeft = onDidTouchSwipeLeftService;
}

export function consumeTouchSwipeRightService(onDidTouchSwipeRightService) {
  onDidTouchSwipeRight = onDidTouchSwipeRightService;
}

var enabled = false;
var disposables;

export function enable() {
  if(enabled) return;
  enabled = true;

  disposables = new SubAtom();

  disposables.add(onDidTouchSwipeLeft(swipeChange, swipeEndLeft));

  disposables.add(onDidTouchSwipeRight(swipeChange, swipeEndRight));
}

export function disable() {
  if(!enabled) return;
  enabled = false;

  disposables.dispose();
  disposables = null;
}

export function isEnabled() {
  return enabled;
}

var currentSwipeEvent = null;

function shouldInitSwipe(event, source) {
  // false if autohide or touch events is disabled
  if(!autohideEnabled() || !getConfig('showOn').match('touch')) return false;
  var { pageX } = event.touches[0];
  // always swipe when target is tree view
  if(!isChildOf(source, getTreeViewEl().parentNode)) {
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
  // calculate new tree view width
  if(getConfig('showOnRightSide', 'tree-view')) deltaX *= -1;
  var newWidth = getTreeViewEl().clientWidth + deltaX;
  newWidth = Math.min(getContentWidth(), Math.max(getConfig('minWidth'), newWidth));
  // request the frame
  requestAnimationFrame(function frame() {
    getTreeViewEl().style.width = `${newWidth}px`;
  });
}

// triggered after swipe left
function swipeEndLeft() {
  if(!currentSwipeEvent) return;
  currentSwipeEvent = null;
  getConfig('showOnRightSide', 'tree-view') ? showTreeView() : hideTreeView();
}

// triggered after swipe right
function swipeEndRight() {
  if(!currentSwipeEvent) return;
  currentSwipeEvent = null;
  getConfig('showOnRightSide', 'tree-view') ? hideTreeView() : showTreeView();
}
