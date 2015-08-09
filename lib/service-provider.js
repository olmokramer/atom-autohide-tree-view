'use babel';
import {
  show,
  hide,
  isVisible,
  enable,
  disable,
  isEnabled,
} from './autohide-tree-view.js';

import {
  activate as pin,
  deactivate as unpin,
  isActive as isPinned,
} from './pin-view.js';

// provide service for other packages to control the tree view
export function provideService() {
  return {
    show,
    hide,
    enable,
    disable,
  };
}

export function provideServiceV2() {
  return {
    show,
    hide,
    isVisible,
    enable,
    disable,
    isEnabled,
  };
}

export function provideServiceV3() {
  return {
    show,
    hide,
    isVisible,
    pin,
    unpin,
    isPinned,
  }
}
