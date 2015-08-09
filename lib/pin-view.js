'use babel';
import SubAtom from 'sub-atom';

import {
  enable as enableAutohide,
  disable as disableAutohide,
} from './autohide-tree-view.js';

var pinView = document.createElement('div');
pinView.classList.add('tree-view-pin-button', 'icon', 'icon-pin');

export default pinView;

var disposables;

export function initialize() {
  disposables = new SubAtom();

  disposables.add(atom.config.observe('autohide-tree-view.showPinButton', showPinButton =>
    pinView.style.display = showPinButton ? '' : 'none'
  ));

  disposables.add(pinView, 'click', () =>
    active ? deactivate() : activate()
  );
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
  disableAutohide();
}

export function deactivate() {
  active = false;
  pinView.classList.remove('active');
  enableAutohide();
}

export function toggle() {
  active ? deactivate() : activate();
}

export function isActive() {
  return active;
}
