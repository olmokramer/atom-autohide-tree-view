'use babel';

const config = {
  showOn: {
    description: 'The type of event that triggers the tree view to show or hide. The touch events require atom-touch-events (https://atom.io/packages/atom-touch-events) to be installed. You\'ll need to restart this package after installing atom-touch-events for touch events to become available.',
    type: 'string',
    default: 'hover + touch',
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
  hiddenWidth: {
    description: 'The width in pixels of the tree view when it is hidden.',
    type: 'integer',
    default: 5,
    minimum: 0,
    order: 3,
  },
  animationSpeed: {
    description: 'The speed in 1000 pixels per second of the animation. Set to 0 to disable the animation.',
    type: 'number',
    default: 1,
    minimum: 0,
    order: 4,
  },
  pushEditor: {
    description: 'Push the edge of the editor around to keep the entire editor contents visible.',
    type: 'boolean',
    default: false,
    order: 5,
  },
  hoverAreaSize: {
    description: 'Width of an invisible area at the edge of the screen where hover events will be triggered. When smaller than the value of the hiddenWidth setting, hiddenWidth will be used instead.',
    type: 'integer',
    default: 0,
    minimum: 0,
    order: 6,
  },
  touchAreaSize: {
    description: 'Width of an invisible area at the edge of the screen where touch events will be triggered.',
    type: 'integer',
    default: 50,
    minimum: 0,
    order: 7,
  },
  maxWindowWidth: {
    description: 'Autohide will be disabled when the window is wider than this. Set to 0 to always enable autohide.',
    type: 'integer',
    default: 0,
    minimum: 0,
    order: 8,
  },
  showPinButton: {
    description: 'Shows a pin button at the top of the tree view that enables/disables autohide.',
    type: 'boolean',
    default: true,
  },
};

export default config;
