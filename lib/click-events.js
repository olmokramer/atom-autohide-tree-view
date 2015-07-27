'use babel';
import SubAtom from 'sub-atom';

import {
  hide as hideTreeView,
  toggle as toggleTreeView,
} from './autohide-tree-view.js';

import {
  hoverEventsEnabled,
} from './hover-events.js';

import {
  getTreeView,
  getTreeViewEl,
  clearFocusedElement,
} from './utils.js';

var enabled = false;
var disposables;

export function enable() {
  if(enabled) return;
  enabled = true;

  disposables = new SubAtom();

  disposables.add(getTreeViewEl(), 'click', () => toggleTreeView());

  disposables.add(getTreeView().list, 'blur', () => {
    if(hoverEventsEnabled()) return;
    // clear the focused element so the element the user
    // clicked will get focus
    clearFocusedElement();
    hideTreeView();
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
