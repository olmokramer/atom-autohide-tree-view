'use babel';
import {
  CompositeDisposable,
} from 'atom';

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

var touchEvents;

export function consumeTouchEvents(touchEventsService) {
  touchEvents = touchEventsService;
  if(getConfig('showOn').match('touch')) enable();
}

var enabled = false;
var disposables;

export function enable() {
  if(!touchEvents)
    return atom.notifications.addWarning('autohide-tree-view: atom-touch-events is not loaded, but it is required for touch events to work');

  if(enabled) return;
  enabled = true;

  disposables = new CompositeDisposable(
    touchEvents.onDidTouchSwipeLeft(swipeChange, () => swipeEnd(false)),
    touchEvents.onDidTouchSwipeRight(swipeChange, () => swipeEnd(true)),
  );
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
  // no swipe if either autohide or touch events is disabled
  if(!autohideEnabled() || !getConfig('showOn').match('touch')) return false;

  var { pageX } = event.touches[0];

  // if swipe target isn't the tree view, check if
  // swipe is in touchArea
  if(!isChildOf(source, getTreeViewEl().parentNode)) {
    // no swipe if not in touch area
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

// triggered after swipe, completely opens/closes the tree view
// depending on the side of the tree view and swipe direction
function swipeEnd(toRight) {
  if(!currentSwipeEvent) return;
  currentSwipeEvent = null;
  // showOnRightSide XOR toRight
  !getConfig('showOnRightSide', 'tree-view') + !toRight == 1 ? showTreeView() : hideTreeView();
}
