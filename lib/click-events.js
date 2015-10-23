'use babel';
import {CompositeDisposable} from 'atom';
import {treeViewEl} from './main.js';
import {hideTreeView, toggleTreeView, isTreeViewVisible,
  clearFocusedElement} from './autohide-tree-view.js';
import {isChildOf, domListener} from './utils.js';

var disposables;

export function enableClickEvents() {
  if(disposables) return;
  disposables = new CompositeDisposable(
    // clicks on the tree view toggle the tree view
    domListener(treeViewEl, 'click', event => {
      if(nextClickInvalidated || event.button != 0) return;
      event.stopPropagation();
      toggleTreeView();
      uninvalidateNextClick();
    }),

    // ignore the next click on the tree view if
    // the event target is a child of tree view
    // but not .tree-view-scroller, on which it
    // should just toggle the tree view
    domListener(treeViewEl, 'click', event => {
      if(!isTreeViewVisible() || event.button != 0) return;
      invalidateNextClick();
    }, {delegationTarget: ':not(.tree-view-scroller)'}),

    // hide and unfocus the tree view when the
    // user clicks anything other than the tree
    // view
    // addDelegatedEventListener(document.body, 'click', ':not(.tree-view-resizer), :not(.tree-view-resizer) *', event => {
    domListener(document.body, 'click', event => {
      if(event.button != 0 || isChildOf(event.target, treeViewEl.parentNode)) return;
      clearFocusedElement();
      hideTreeView();
      uninvalidateNextClick();
    }),
  );
}

export function disableClickEvents() {
  if(!disposables) return;
  disposables.dispose();
  disposables = null;
}

export function isClickEventsEnabled() {
  return !!disposables;
}

// keep track if the next click event
// should trigger a toggleTreeView
var nextClickInvalidated = false;

function invalidateNextClick() {
  nextClickInvalidated = true;
}

function uninvalidateNextClick() {
  nextClickInvalidated = false;
}
