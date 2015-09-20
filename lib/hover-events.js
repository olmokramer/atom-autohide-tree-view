'use babel';
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
    showTreeView(getConfig('showDelay'), false, getConfig('autoFocusTreeViewOnHover'))
  );

  disposables.add(getTreeViewEl(), 'mouseleave', () =>
    hideTreeView(getConfig('hideDelay'), getConfig('autoFocusTreeViewOnHover'))
  );

  disposables.add(getTreeViewEl().querySelector('.tree-view-resize-handle'), 'mousedown', event => {
    if(event.button == 0) disableDuringMouseDown();
  });

  disposables.add('atom-workspace', 'mousedown', 'atom-text-editor', event => {
    if(event.button == 0) disableDuringMouseDown();
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
}

export function disableDuringMouseDown() {
  disable();
  document.body.addEventListener('mouseup', function onMouseUp() {
    enable();
    document.body.removeEventListener('mouseup', onMouseUp);
  });
}

export function disableUntilBlur() {
  if(!enabled) return;
  disable();

  var disposable = new SubAtom();

  disposable.add(getTreeView().list, 'blur', function onBlur() {
    clearFocusedElement();
    enable();
    hideTreeView();
    this.removeEventListener('blur', onBlur);
    disposable.dispose();
  });

  return disposable;
}
