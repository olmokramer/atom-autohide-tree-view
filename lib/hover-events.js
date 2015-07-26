'use babel';
import 'object-assign-shim';

import SubAtom from 'sub-atom';

import { showTreeView, hideTreeView, getTreeViewEl } from './autohide-tree-view.js';

import { getConfig } from './utils.js';

var enabled = false;
var hoverArea;
var disposables;

function enable() {
  if(enabled || !getConfig('showOn').match('hover')) return;
  enabled = true;

  hoverArea = document.createElement('div');
  hoverArea.classList.add('tree-view-autohide-hover-area');
  getTreeViewEl().appendChild(hoverArea);

  disposables = new SubAtom();

  disposables.add(atom.config.observe('autohide-tree-view.hoverAreaSize', hoverAreaSize =>
    updateSize(hoverAreaSize)
  ));

  disposables.add(atom.config.observe('autohide-tree-view.minWidth', () =>
    updateSize()
  ));

  disposables.add(hoverArea, 'mouseenter', () =>
    showTreeView(getConfig('showDelay'), false)
  );

  disposables.add(getTreeViewEl(), 'mouseleave', () =>
    hideTreeView(getConfig('hideDelay'))
  );
}

function disable() {
  if(!enabled) return;
  enabled = false;

  hoverArea.remove();

  disposables.dispose();
  [ hoverArea, disposables ] = [];
}

function isEnabled() {
  return enabled;
}

function updateSize(hoverWidth = getConfig('hoverAreaSize')) {
  var minWidth = getConfig('minWidth');
  hoverWidth = Math.max(1, hoverWidth, minWidth);
  Object.assign(hoverArea.style, {
    width: `${hoverWidth}px`,
    margin: `-${minWidth}px`,
  });
}

export {
  enable as enableHoverEvents,
  disable as disableHoverEvents,
  isEnabled as hoverEventsEnabled,
};
