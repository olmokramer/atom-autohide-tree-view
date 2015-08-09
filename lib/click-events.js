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

  // clicks on the tree view toggle the tree view
  disposables.add(getTreeViewEl(), 'click', event => {
    if(isNextClickInvalidated() || event.button != 0) return;

    event.stopPropagation();
    toggleTreeView();
    uninvalidateNextClick();
  });

  // ignore the next click on the tree view if
  // the event target is a child of tree view
  // but not .tree-view-scroller, on which it
  // should just toggle the tree view
  disposables.add(getTreeViewEl(), 'click', ':not(.tree-view-scroller)', event => {
    if(!isTreeViewVisible() || event.button != 0) return;

    invalidateNextClick();
  });

  // hide and unfocus the tree view when the
  // user clicks anything other than the tree
  // view
  disposables.add(document.body, 'click', ':not(.tree-view-resizer), :not(.tree-view-resizer) *', event => {
    if(event.button != 0) return;

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
