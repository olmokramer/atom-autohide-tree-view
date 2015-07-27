'use babel';
import pinView from './pin-view.js';

import { getConfig } from './config.js';

export function logError(error) {
  console.error(error.message, error.stack);
}

export function isChildOf(childNode, parentNode) {
  while (childNode != parentNode && childNode != document.body) {
    childNode = childNode.parentNode;
  }
  return childNode == parentNode;
}

export function getTreeView() {
  if(atom.packages.isPackageActive('tree-view'))
    return atom.packages.getActivePackage('tree-view').mainModule.createView();
}

export function getTreeViewEl() {
  return atom.views.getView(getTreeView());
}

export function getContentWidth() {
  var contentWidth = 0;
  for(let element of Array.from(getTreeViewEl().querySelectorAll('.list-tree'))) {
    if(element.clientWidth > contentWidth) contentWidth = element.clientWidth;
  }

  var pinViewWidth = pinView.clientWidth;
  var treeViewWidth = contentWidth + pinViewWidth;

  var minWidth = getConfig('minWidth');
  var maxWidth = getConfig('maxWidth');

  treeViewWidth = Math.max(minWidth, treeViewWidth);
  if(maxWidth) treeViewWidth = Math.min(maxWidth, treeViewWidth);

  return treeViewWidth + pinViewWidth;
}

var focusedElement;

// cache the element that currently has focus
export function storeFocusedElement() {
  if(!focusedElement) focusedElement = document.activeElement;
}

// clear the reference to the focusedElement. useful
// when we want to invalidate the next restoreFocus
export function clearFocusedElement() {
  focusedElement = null;
}

// restores focus on focusedElement
export function restoreFocus() {
  if(!focusedElement) return;
  if(typeof focusedElement.focused === 'function') {
    focusedElement.focused();
  } else if(typeof focusedElement.focus === 'function') {
    focusedElement.focus();
  }
  clearFocusedElement();
}
