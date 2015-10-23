'use babel';
import 'array.from';
import {CompositeDisposable} from 'atom';
import {treeViewEl} from './main.js';
import {showTreeView, hideTreeView} from './autohide-tree-view.js';
import config from './config.js';
import {getContentWidth, isChildOf} from './utils.js';

var touchEvents;

export function consumeTouchEvents(touchEventsService) {
  touchEvents = touchEventsService;
  if(config.showOn.match('touch')) enableTouchEvents();
}

var disposables;

export function enableTouchEvents() {
  if(!touchEvents)
    return atom.notifications.addWarning('autohide-tree-view: atom-touch-events is not loaded, but it is required for touch events to work');

  if(disposables) return;
  disposables = new CompositeDisposable(
    touchEvents.onDidTouchSwipeLeft(swipeChange, () => swipeEnd(false)),
    touchEvents.onDidTouchSwipeRight(swipeChange, () => swipeEnd(true)),
  );
}

export function disableTouchEvents() {
  if(!disposables) return;
  disposables.dispose();
  disposables = null;
}

export function isTouchEventsEnabled() {
  return !!disposables;
}

var isSwiping = false;

function shouldInitSwipe(touches, source) {
  // no swipe if either autohide or touch events is disabled
  if(!isTouchEventsEnabled()) return false;
  var [{pageX}] = Array.from(touches);
  // if swipe target isn't the tree view, check if
  // swipe is in touchArea
  if(!isChildOf(source, treeViewEl.parentNode)) {
    // no swipe if not in touch area
    var showOnRightSide = atom.config.get('tree-view.showOnRightSide');
    if(showOnRightSide && pageX < window.innerWidth - config.touchAreaSize ||
      !showOnRightSide && pageX > config.touchAreaSize)
      return false;
  }
  return isSwiping = true;
}

// triggered while swiping the tree view
function swipeChange({args: {touches}, source, deltaX}) {
  // check if swipe should show the tree view
  if(!isSwiping && !shouldInitSwipe(touches, source)) return;
  if(atom.config.get('tree-view.showOnRightSide')) deltaX *= -1;
  requestAnimationFrame(function frame() {
    var newWidth = treeViewEl.clientWidth + deltaX;
    newWidth = Math.min(getContentWidth(), Math.max(config.minWidth, newWidth));
    treeViewEl.style.width = `${newWidth}px`;
  });
}

// triggered after swipe, completely opens/closes the tree view
// depending on the side of the tree view and swipe direction
function swipeEnd(toRight) {
  if(!isSwiping) return;
  isSwiping = false;
  atom.config.get('tree-view.showOnRightSide') != toRight ? showTreeView() : hideTreeView();
}
