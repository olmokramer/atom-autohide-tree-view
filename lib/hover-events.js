'use babel';
import 'object-assign-shim';

import {
  Disposable,
} from 'atom';

import SubAtom from 'sub-atom';

import {
  show as showTreeView,
  hide as hideTreeView,
} from './autohide-tree-view.js';

import {
  getConfig,
} from './config.js';

import {
  getTreeView,
  getTreeViewEl,
  clearFocusedElement,
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

  disposables.add(getTreeViewEl().querySelector('.tree-view-resize-handle'), 'mousedown', event => {
    if(event.which != 0) return;
    disableDuringMouseDown();
  });

  disposables.add('atom-workspace', 'mousedown', 'atom-text-editor', event => {
    if(event.which != 0) return;
    disableDuringMouseDown();
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
  hoverArea.style.minWidth = `${hoverWidth}px`;
  Object.assign(hoverArea.style, {
    minWidth: `${hoverWidth}px`,
  });
}

export function disableDuringMouseDown() {
  disable();
  document.body.addEventListener('mouseup', function onMouseUp() {
    enable();
    document.body.removeEventListener('mouseup', onMouseUp);
  });
}

export function disableUntilBlur() {
  disable();

  function onBlur() {
    disposable.dispose();
    clearFocusedElement();
    enable();
    hideTreeView();
  }

  getTreeView().list[0].addEventListener('blur', onBlur);

  var disposable = new Disposable(() => {
    getTreeView().list[0].removeEventListener('blur', onBlur);
    [ onBlur, disposable ] = [];
  });

  return disposable;
}
