'use babel';
import {CompositeDisposable} from 'atom';
import {treeView, treeViewEl} from './main.js';
import {showTreeView, hideTreeView, eventTriggerArea,
  clearFocusedElement} from './autohide-tree-view.js';
import config from './config.js';
import {addEventListener, addDelegatedEventListener} from './utils.js';

var disposables;

export function enableHoverEvents() {
  if(disposables) return;
  disposables = new CompositeDisposable(
    addEventListener(eventTriggerArea, 'mouseenter', () =>
      showTreeView(config.showDelay, false)
    ),

    addEventListener(treeViewEl, 'mouseleave', () =>
      hideTreeView(config.hideDelay)
    ),

    addEventListener(treeViewEl.querySelector('.tree-view-resize-handle'), 'mousedown', event => {
      if(event.button == 0) disableHoverEventsDuringMouseDown();
    }),

    addDelegatedEventListener(document.body, 'mousedown', 'atom-text-editor', event => {
      if(event.button == 0) disableHoverEventsDuringMouseDown();
    }),
  );
}

export function disableHoverEvents() {
  if(!disposables) return;
  disposables.dispose();
  disposables = null;
}

export function isHoverEventsEnabled() {
  return !!disposables;
}

export function disableHoverEventsDuringMouseDown() {
  if(!disposables) return;
  disableHoverEvents();
  addEventListener(document.body, 'mouseup', () => {
    enableHoverEvents();
  }, false, true);
}

export function disableHoverEventsUntilBlur() {
  if(!disposables) return;
  disableHoverEvents();
  addEventListener(treeView.list[0], 'blur', () => {
    clearFocusedElement();
    enableHoverEvents();
    hideTreeView();
  }, false, true);
}
