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
  var contentWidth = getTreeView().list[0].clientWidth;
  var pinViewWidth = pinView.clientWidth;
  return Math.max(contentWidth + pinViewWidth);
}
