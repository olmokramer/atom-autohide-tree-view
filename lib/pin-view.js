'use babel';
import 'object-assign-shim';

import SubAtom from 'sub-atom';

import {
  enable as enableAutohide,
  disable as disableAutohide,
} from './autohide-tree-view.js';

import {
  observeConfig,
} from './config.js';

import {
  getTreeViewEl,
} from './utils.js';

var prototype = Object.assign(Object.create(HTMLElement.prototype), {
  createdCallback() {
    this.classList.add('icon', 'icon-pin');
    this.deactivate();
  },

  attachedCallback() {
    this.disposables = new SubAtom();

    this.disposables.add(observeConfig('showPinButton', showPinButton =>
      this.style.display = showPinButton ? '' : 'none'
    ));

    this.disposables.add(this, 'mousedown', event => {
      if(event.button == 0) {
        this.isActive ? enableAutohide() : disableAutohide();
      }
    });
  },

  detachedCallback() {
    this.disposables.dispose();
    this.disposables = null;
  },

  attach() {
    getTreeViewEl().appendChild(this);
  },

  detach() {
    this.remove();
  },

  activate() {
    this.isActive = true;
    this.classList.add('active');
    this.setTooltip('Unpin tree-view');
  },

  deactivate() {
    this.isActive = false;
    this.classList.remove('active');
    this.setTooltip('Pin tree-view');
  },

  setTooltip(tooltip) {
    if(this.tooltipDisposable)
      this.tooltipDisposable.dispose();

    this.tooltipDisposable = atom.tooltips.add(this, {
      title: tooltip,
    });
  },
});

const tagName = 'tree-view-pin-button';

document.registerElement(tagName, {prototype});

var pinView = document.createElement(tagName);

export default pinView;
