'use babel';
import SubAtom from 'sub-atom';

import {
  enable as enableAutohide,
  disable as disableAutohide,
} from './autohide-tree-view.js';

import {
  observeConfig,
} from './config.js';

var pinView = document.createElement('div');
pinView.classList.add('tree-view-pin-button', 'icon', 'icon-pin');

export default pinView;

var disposables;

export function initialize() {
  disposables = new SubAtom();

  disposables.add(observeConfig('showPinButton', showPinButton =>
    pinView.style.display = showPinButton ? '' : 'none'
  ));

  disposables.add(pinView, 'click', event => {
    if(event.which != 1) return;

    active ? deactivate() : activate();
  });
}

export function destroy() {
  pinView.remove();

  disposables.dispose();
  disposables = null;
}

var active = false;

export function activate() {
  active = true;
  pinView.classList.add('active');
  return disableAutohide();
}

export function deactivate() {
  active = false;
  pinView.classList.remove('active');
  return enableAutohide();
}

export function toggle() {
  active ? deactivate() : activate();
}

export function isActive() {
  return active;
}
