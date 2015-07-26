'use babel';
import pinView from './pin-view.js';

// some generic functions
export function logError(error) {
  console.error(error.message, error.stack);
}

export function getConfig(key, ns = 'autohide-tree-view') {
  return atom.config.get(`${ns}.${key}`);
}

export function setConfig(key, value, ns = 'autohide-tree-view') {
  atom.config.set(`${ns}.${key}`, value);
}

export function toggleConfig(key, ns) {
  setConfig(key, !getConfig(key, ns), ns);
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

  return treeViewWidth;
}
