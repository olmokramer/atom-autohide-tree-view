'use babel';
import {CompositeDisposable} from 'atom';
import {treeView, treeViewEl} from './main.js';
import {showTreeView, hideTreeView, eventTriggerArea,
  clearFocusedElement} from './autohide-tree-view.js';
import config from './config.js';
import {domListener} from './utils.js';

var disposables;

export function enableHoverEvents() {
  if(disposables) return;
  disposables = new CompositeDisposable(
    domListener(eventTriggerArea, 'mouseenter', () =>
      showTreeView(config.showDelay, false)
    ),

    domListener(treeViewEl, 'mouseleave', () =>
      hideTreeView(config.hideDelay)
    ),

    domListener(treeViewEl.querySelector('.tree-view-resize-handle'), 'mousedown', event => {
      if(event.button == 0) disableHoverEventsDuringMouseDown();
    }),

    domListener(document.body, 'mousedown', event => {
      if(event.button == 0) disableHoverEventsDuringMouseDown();
    }, {delegationTarget: 'atom-text-editor'}),
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
  domListener(document.body, 'mouseup', () => {
    enableHoverEvents();
  }, {once: true});
}

export function disableHoverEventsUntilBlur() {
  if(!disposables) return;
  disableHoverEvents();
  domListener(treeView.list[0], 'blur', () => {
    clearFocusedElement();
    enableHoverEvents();
    hideTreeView();
  }, {once: true});
}
