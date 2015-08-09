'use babel';
import SubAtom from 'sub-atom';

import {
  hide as hideTreeView,
  toggle as toggleTreeView,
  isVisible as isTreeViewVisible,
} from './autohide-tree-view.js';

import {
  getTreeViewEl,
  clearFocusedElement,
} from './utils.js';

var enabled = false;
var disposables;

export function enable() {
  if(enabled) return;
  enabled = true;

  disposables = new SubAtom();

  disposables.add(getTreeViewEl(), 'click', event => {
    event.stopPropagation();
    if(!isNextClickInvalidated()) toggleTreeView();
    uninvalidateNextClick();
  });

  disposables.add(getTreeViewEl(), 'click', ':not(.tree-view-scroller)', () => {
    if(isTreeViewVisible()) invalidateNextClick();
  });

  disposables.add(document.body, 'click', ':not(.tree-view-resizer), :not(.tree-view-resizer) *', () => {
    clearFocusedElement();
    hideTreeView();
    uninvalidateNextClick();
  });
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

// keep track if the next click event
// should trigger a toggleTreeView
var nextClickInvalidated = false;

function invalidateNextClick() {
  nextClickInvalidated = true;
}

function uninvalidateNextClick() {
  nextClickInvalidated = false;
}

function isNextClickInvalidated() {
  return nextClickInvalidated;
}
