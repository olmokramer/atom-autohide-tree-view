'use babel';
import {showTreeView, hideTreeView, isTreeViewVisible,
  enableAutohide, disableAutohide, isAutohideEnabled} from './autohide-tree-view.js';

// provide service for other packages to control the tree view
export function provideService() {
  return {
    showTreeView,
    hideTreeView,
    enableAutohide,
    disableAutohide,
  };
}

export function provideServiceV2() {
  return {
    showTreeView,
    hideTreeView,
    isTreeViewVisible,
    enableAutohide,
    disableAutohide,
    isAutohideEnabled,
  };
}

export function provideServiceV3() {
  return {
    showTreeView,
    hideTreeView,
    isTreeViewVisible,
    pin: enableAutohide,
    unpin: disableAutohide,
    isPinned: isAutohideEnabled,
  };
}
