'use babel';
import 'object-assign-shim';

import SubAtom from 'sub-atom';

import {
  show as showTreeView,
  hide as hideTreeView,
} from './autohide-tree-view.js';

import {
  getConfig,
} from './config.js';

import {
  getTreeViewEl,
} from './utils.js';

export var hoverArea = document.createElement('div');
hoverArea.classList.add('tree-view-autohide-hover-area');

var enabled = false;
var disposables;

export function enable() {
  if(enabled || !getConfig('showOn').match('hover')) return;
  enabled = true;

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

  disposables.add(getTreeViewEl().querySelector('.tree-view-resize-handle'), 'mousedown', () => {
    disable();
    document.body.addEventListener('mouseup', function onMouseUp() {
      document.body.removeEventListener('mouseup', onMouseUp);
      enable();
    });
  });
}

export function disable() {
  if(!enabled) return;
  enabled = false;

  hoverArea.remove();

  disposables.dispose();
  disposables = null;
}

export function isEnabled() {
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
