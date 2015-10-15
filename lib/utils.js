'use babel';
import 'array.from';
import {Disposable} from 'atom';
import config from './config.js';

export function logError(error) {
  atom.notifications.addError(`autohide-tree-view: ${error.message}`);
  console.error(error);
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

// add event listeners
export function addEventListener(el, type, cb, useCapture = false, once = false) {
  var disposable;
  function wrapper(event) {
    cb.call(el, event);
    if(once) disposable.dispose();
  }
  el.addEventListener(type, wrapper, useCapture);
  return disposable = new Disposable(() =>
    el.removeEventListener(type, wrapper, useCapture)
  );
}

export function addDelegatedEventListener(el, type, delegationTarget, cb, useCapture = true, once = false) {
  function wrapper(event) {
    var {target} = event;
    while (!target.matches(delegationTarget) && target != el) {
      target = target.parentNode;
    }
    if (target != el) cb.call(target, event);
  }
  return addEventListener(el, type, wrapper, useCapture, once);
}

// check if parent contains child, parent can be Node or string
export function isChildOf(child, parent) {
  if(parent instanceof HTMLElement)
    return parent.contains(child);

  while(child.parentNode != document && child.parentNode != null) {
    if(child.parentNode.matches(parent))
      return true;
    child = child.parentNode;
  }
  return false;
}

// returns the width of the .list-tree
export function getContentWidth() {
  var listTrees = Array.from(getTreeViewEl().querySelectorAll('.list-tree'));
  var maxListWidth = Math.max(...listTrees.map(listTree => listTree.clientWidth));
  // only apply maxWidth if it's greater than 0
  return Math.min(Math.max(maxListWidth, config.minWidth), config.maxWidth || Infinity);
}
