'use babel';
import 'array.from';

import {
  getConfig,
} from './config.js';

export function logError(error) {
  console.error(error.message, error.stack);
}

export function isChildOf(child, parent) {
  var isString = typeof parent == 'string';
  while(child.parentNode != document && child.parentNode != null) {
    if((isString && child.parentNode.matches(parent)) || child.parentNode == parent)
      return true;
    child = child.parentNode;
  }
  return false;
}

// returns the tree view model
export function getTreeView() {
  if(atom.packages.isPackageActive('tree-view'))
    return atom.packages.getActivePackage('tree-view').mainModule.createView();
}

// returns the top-level element created by the tree view package
export function getTreeViewEl() {
  return atom.views.getView(getTreeView());
}

// returns the width of the .list-tree
export function getContentWidth() {
  var listTrees = Array.from(getTreeViewEl().querySelectorAll('.list-tree'));
  var maxListWidth = Math.max(...listTrees.map(listTree =>
    listTree.clientWidth
  ));

  var minWidth = getConfig('minWidth');
  // only apply maxWidth if it's greater than 0
  var maxWidth = getConfig('maxWidth') || Infinity;
  return Math.min(Math.max(maxListWidth, minWidth), maxWidth);
}

// functions that deal with focusing the right
// element at the right time

var focusedElement;

// cache the element that currently has focus
export function storeFocusedElement(el = document.activeElement) {
  if(!isChildOf(el, getTreeViewEl().parentNode))
    focusedElement = el;
}

// clear the reference to the focusedElement. useful
// when we want to invalidate the next restoreFocus
export function clearFocusedElement() {
  focusedElement = null;
}

// restores focus on focusedElement
export function restoreFocus() {
  // only restore focus if tree view has focus
  if(!focusedElement || document.activeElement != getTreeView().list[0])
    return;
  if(typeof focusedElement.focus == 'function')
    focusedElement.focus();
  clearFocusedElement();
}

// focus the tree view with some logic around it to cancel
export function focusTreeView() {
  // don't focus if a modal panel has focus
  // because they tend to close when they lose focus
  if(isChildOf(document.activeElement, 'atom-panel.modal'))
    return;

  getTreeView().focus();
}
