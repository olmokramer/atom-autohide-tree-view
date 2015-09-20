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

  disposables.add(pinView, 'mousedown', event => {
    console.log('pin mouse down', event.button, active);
    event.stopPropagation();
    if(event.button == 0)
      active ? enableAutohide() : disableAutohide();
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
}

export function deactivate() {
  active = false;
  pinView.classList.remove('active');
}

export function isActive() {
  return active;
}
