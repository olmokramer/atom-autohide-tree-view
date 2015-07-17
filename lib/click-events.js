'use babel';
import SubAtom from 'sub-atom';

import { toggleTreeView, getTreeViewEl } from './autohide-tree-view.js';

var enabled = false, disposables;

function enable() {
  if(enabled) return;
  enabled = true;

  disposables = new SubAtom();

  disposables.add(getTreeViewEl(), 'click', function() {
    toggleTreeView();
  });
}

function disable() {
  if(!enabled) return;
  enabled = false;

  disposables.dispose();
  disposables = null;
}

function isEnabled() {
  return enabled;
}

export {
  enable as enableClickEvents,
  disable as disableClickEvents,
  isEnabled as clickEventsEnabled
}
