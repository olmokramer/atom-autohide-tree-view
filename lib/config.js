'use babel';
import {CompositeDisposable} from 'atom';
import {updateTreeView, updateTriggerArea} from './autohide-tree-view.js';
import {enableHoverEvents, disableHoverEvents} from './hover-events.js';
import {enableClickEvents, disableClickEvents} from './click-events.js';
import {enableTouchEvents, disableTouchEvents} from './touch-events.js';
import pinView from './pin-view.js';

export const schema = {
  showOn: {
    description: 'The type of event that triggers the tree view to show or hide. The touch events require atom-touch-events (https://atom.io/packages/atom-touch-events) to be installed. You\'ll need to restart Atom after installing atom-touch-events for touch events to become available.',
    type: 'string',
    default: 'hover',
    enum: [
      'hover',
      'click',
      'touch',
      'hover + click',
      'hover + touch',
      'click + touch',
      'hover + click + touch',
      'none',
    ],
    order: 0,
  },
  showDelay: {
    description: 'The delay in milliseconds before the tree view will show. Only applies to hover events.',
    type: 'integer',
    default: 200,
    minimum: 0,
    order: 1,
  },
  hideDelay: {
    description: 'The delay in milliseconds before the tree view will hide. Only applies to hover events.',
    type: 'integer',
    default: 200,
    minimum: 0,
    order: 2,
  },
  minWidth: {
    description: 'The width in pixels of the tree view when it is hidden.',
    type: 'integer',
    default: 5,
    minimum: 0,
    order: 3,
  },
  maxWidth: {
    description: 'The max width in pixels of the tree view when it is expanded. Set to 0 to always extend to the max filename width.',
    type: 'integer',
    default: 0,
    minimum: 0,
    order: 4,
  },
  animationSpeed: {
    description: 'The speed in 1000 pixels per second of the animation. Set to 0 to disable the animation.',
    type: 'number',
    default: 1,
    minimum: 0,
    order: 5,
  },
  pushEditor: {
    description: 'Push the edge of the editor around to keep the entire editor contents visible.',
    type: 'boolean',
    default: false,
    order: 6,
  },
  triggerAreaSize: {
    description: 'Size of the area at the edge of the screen where hover/click events will trigger the tree view to show/hide',
    type: 'integer',
    default: 0,
    minimum: 0,
    order: 7,
  },
  touchAreaSize: {
    description: 'Width of an invisible area at the edge of the screen where touch events will be triggered.',
    type: 'integer',
    default: 50,
    minimum: 0,
    order: 8,
  },
  maxWindowWidth: {
    description: 'Autohide will be disabled when the window is wider than this. Set to 0 to always enable autohide.',
    type: 'integer',
    default: 0,
    minimum: 0,
    order: 9,
  },
  showPinButton: {
    description: 'Shows a pin button at the top of the tree view that enables/disables autohide.',
    type: 'boolean',
    default: true,
    order: 10,
  },
};

var config = Object.create(null);
export default config;

for(let key of Object.keys(schema)) {
  Object.defineProperty(config, key, {
    get() { // eslint-disable-line no-loop-func
      return atom.config.get(`autohide-tree-view.${key}`);
    },
  });
}

export function observeConfig() {
  return new CompositeDisposable(
    // changes to these settings should trigger an update
    atom.config.onDidChange('autohide-tree-view.pushEditor', () =>
      updateTreeView()
    ),
    atom.config.onDidChange('autohide-tree-view.minWidth', () => {
      updateTreeView();
      updateTriggerArea();
    }),
    atom.config.onDidChange('tree-view.showOnRightSide', () =>
      updateTreeView()
    ),
    atom.config.onDidChange('tree-view.hideIgnoredNames', () =>
      updateTreeView()
    ),
    atom.config.onDidChange('tree-view.hideVcsIgnoredFiles', () =>
      updateTreeView()
    ),
    atom.config.onDidChange('core.ignoredNames', () =>
      updateTreeView()
    ),
    atom.config.observe('autohide-tree-view.triggerAreaSize', () =>
      updateTriggerArea()
    ),

    // enable or disable the event types
    atom.config.observe('autohide-tree-view.showOn', showOn => {
      showOn.match('hover') ? enableHoverEvents() : disableHoverEvents();
      showOn.match('click') ? enableClickEvents() : disableClickEvents();
      showOn.match('touch') ? enableTouchEvents() : disableTouchEvents();
    }),

    atom.config.observe('autohide-tree-view.showPinButton', showPinButton =>
      showPinButton ? pinView.show() : pinView.hide()
    ),
  );
}
