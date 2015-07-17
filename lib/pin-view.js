'use babel';
import SubAtom from 'sub-atom';

import { enableAutohide, disableAutohide } from './autohide-tree-view.js';

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
  var parentNode = pinView.parentNode;
  if(parentNode) parentNode.removeChild(pinView);

  disposables.dispose();
  disposables = null;
}

var active = false;

function activate() {
  active = true;
  pinView.classList.add('active');
  disableAutohide();
}

function deactivate() {
  active = false;
  pinView.classList.remove('active');
  enableAutohide();
}
