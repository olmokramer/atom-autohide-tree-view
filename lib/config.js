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
  minWidth: {
    description: 'The width in pixels of the tree view when it is hidden.',
    type: 'integer',
    default: 5,
    minimum: 0,
    order: 3,
  },
  maxWidth: {
    description: 'The max width of the tree view when it is expanded in pixels. Set to 0 to always extend to the max filename width.',
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
  hoverAreaSize: {
    description: 'Width of an invisible area at the edge of the screen where hover events will be triggered. When smaller than the value of the minWidth setting, minWidth will be used instead.',
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

export default config;

export function getConfig(key, ns = 'autohide-tree-view') {
  return atom.config.get(`${ns}.${key}`);
}

export function setConfig(key, value, ns = 'autohide-tree-view') {
  atom.config.set(`${ns}.${key}`, value);
}

export function unsetConfig(key, ns = 'autohide-tree-view') {
  atom.config.unset(`${ns}.${key}`);
}

export function toggleConfig(key, ns) {
  setConfig(key, !getConfig(key, ns), ns);
}

export function observeConfig(key, ns, cb) {
  if(!cb) [ ns, cb ] = [ 'autohide-tree-view', ns ];
  return atom.config.observe(`${ns}.${key}`, cb);
}

export function onDidChangeConfig(key, ns, cb) {
  if(!cb) [ ns, cb ] = [ 'autohide-tree-view', ns ];
  return atom.config.onDidChange(`${ns}.${key}`, cb);
}

export function migrateConfig() {
  // array of [oldName, newName] arrays
  var settingsToMigrate = [
    [ 'hiddenWidth', 'minWidth' ],
  ];
  for(let [ oldSetting, newSetting ] of settingsToMigrate) {
    let oldValue = getConfig(oldSetting);
    if(oldValue == null) continue;
    setConfig(newSetting, oldValue);
    unsetConfig(oldSetting);
  }
}
