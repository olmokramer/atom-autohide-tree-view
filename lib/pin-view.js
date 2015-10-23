'use babel';
import {treeViewEl} from './main.js';
import {toggleAutohide} from './autohide-tree-view.js';
import {domListener} from './utils.js';

var pinView = document.createElement('div');
pinView.classList.add('tree-view-pin-button', 'icon', 'icon-pin');
domListener(pinView, 'mousedown', () => toggleAutohide());

export default {
  attach() {
    treeViewEl.querySelector('.tree-view-scroller').appendChild(pinView);
    this.deactivate();
  },

  detach() {
    pinView.remove();
    if(tooltip) tooltip.dispose();
  },

  show() {
    pinView.style.display = '';
  },

  hide() {
    pinView.style.display = 'none';
  },

  activate() {
    pinView.classList.add('active');
    setTooltip('Pin tree-view');
  },

  deactivate() {
    pinView.classList.remove('active');
    setTooltip('Unpin tree-view');
  },

  isActive() {
    return !!pinView.parentNode && pinView.classList.contains('active');
  },
};

var tooltip;

function setTooltip(title) {
  if(tooltip) tooltip.dispose();
  tooltip = atom.tooltips.add(pinView, {title});
}
