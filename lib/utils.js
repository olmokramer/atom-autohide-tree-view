'use babel';
import 'array.from';
import {Disposable} from 'atom';
import {treeViewEl} from './main.js';
import config from './config.js';

export function domListener(el, type, cb, {useCapture, delegationTarget, once} = {}) {
  if(!(el instanceof EventTarget))
    throw new TypeError('Failed to create DOMEventListener: parameter 1 is not of type EventTarget');

  function wrapper(event, ...args) {
    if(delegationTarget) {
      target = event.target.closest(delegationTarget);
      if(el.contains(target))
        cb.apply(target, [event].concat(args));
    } else {
      cb.apply(el, [event].concat(args));
    }
  }

  function onceWrapper() {
    disposable.dispose();
    wrapper.apply(null, Array.from(arguments));
  }

  var actualWrapper = once ? onceWrapper : wrapper;

  el.addEventListener(type, actualWrapper, useCapture);
  var disposable = new Disposable(() =>
    el.removeEventListener(type, actualWrapper, useCapture)
  );

  return disposable;
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
  var listTrees = Array.from(treeViewEl.querySelectorAll('.list-tree'));
  var maxListWidth = Math.max(...listTrees.map(listTree => listTree.clientWidth));
  // only apply maxWidth if it's greater than 0
  return Math.min(Math.max(maxListWidth, config.minWidth), config.maxWidth || Infinity);
}
