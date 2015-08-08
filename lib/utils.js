'use babel';
import {
  getConfig,
} from './config.js';

export function logError(error) {
  console.error(error.message, error.stack);
}

export function isChildOf(childNode, parentNode) {
  while (childNode != parentNode && childNode != document.body) {
    childNode = childNode.parentNode;
  }
  return childNode == parentNode;
}

// returns the tree view model
export function getTreeView() {
  if(atom.packages.isPackageActive('tree-view')) {
    return atom.packages.getActivePackage('tree-view').mainModule.createView();
  }
}

// returns the top-level element created by the tree view package
export function getTreeViewEl() {
  return atom.views.getView(getTreeView());
}

// returns the width of the .list-tree with the max width,
// clamped between the minWidth and maxWidth settings
export function getContentWidth() {
  var listTrees = Array.from(getTreeViewEl().querySelectorAll('.list-tree'));
  var maxListWidth = Math.max(...listTrees.map(listTree =>
    listTree.clientWidth
  ));

  var minWidth = getConfig('minWidth');
  var maxWidth = getConfig('maxWidth');

  // only apply maxWidth if it's greater than 0
  return Math.min(Math.max(maxListWidth, minWidth), maxWidth || Infinity);
}

var focusedElement;

// cache the element that currently has focus
export function storeFocusedElement(el) {
  if(!focusedElement) focusedElement = el || document.activeElement;
}

// clear the reference to the focusedElement. useful
// when we want to invalidate the next restoreFocus
export function clearFocusedElement() {
  focusedElement = null;
}

// restores focus on focusedElement
export function restoreFocus() {
  if(!focusedElement) {
    return;
  } else if(typeof focusedElement.focus == 'function') {
    focusedElement.focus();
  }
  clearFocusedElement();
}
