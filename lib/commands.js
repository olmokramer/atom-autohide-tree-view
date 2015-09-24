'use babel';

import {
  CompositeDisposable,
} from 'atom';

import {
  show as showTreeView,
  hide as hideTreeView,
  toggle as toggleTreeView,
  update as updateTreeView,
  resize as resizeTreeView,
} from './autohide-tree-view.js';

import {
  enable as enableHoverEvents,
  disable as disableHoverEvents,
} from './hover-events.js';

import {
  enable as enableClickEvents,
  disable as disableClickEvents,
} from './click-events.js';

import {
  enable as enableTouchEvents,
  disable as disableTouchEvents,
} from './touch-events.js';

import {
  observeConfig,
  onDidChangeConfig,
} from './config.js';

import {
  getTreeView,
  getTreeViewEl,
  storeFocusedElement,
} from './utils.js';

export default function initCommands() {
  var disposables = new CompositeDisposable(
    // changes to these settings should trigger an update
    onDidChangeConfig('pushEditor', ({newValue: pushEditor}) =>
      updateTreeView(pushEditor)
    ),
    onDidChangeConfig('minWidth', () =>
      updateTreeView()
    ),
    onDidChangeConfig('showOnRightSide', 'tree-view', () =>
      updateTreeView()
    ),
    onDidChangeConfig('hideIgnoredNames', 'tree-view', () =>
      updateTreeView()
    ),
    onDidChangeConfig('hideVcsIgnoredFiles', 'tree-view', () =>
      updateTreeView()
    ),
    onDidChangeConfig('ignoredNames', 'core', () =>
      updateTreeView()
    ),

    // enable or disable the event types
    observeConfig('showOn', showOn => {
      showOn.match('hover') ? enableHoverEvents() : disableHoverEvents();
      showOn.match('click') ? enableClickEvents() : disableClickEvents();
      showOn.match('touch') ? enableTouchEvents() : disableTouchEvents();
    }),

    // resize the tree view when project.paths changes
    atom.project.onDidChangePaths(() =>
      resizeTreeView()
    ),

    // add command listeners
    atom.commands.add('atom-workspace', {
      // tree-view commands
      ['tree-view:show'](event) {
        event.stopImmediatePropagation();
        showTreeView();
      },
      // this one isn't actually in the tree-view package
      // but have it here just in case :)
      ['tree-view:hide'](event) {
        event.stopImmediatePropagation();
        hideTreeView();
      },
      ['tree-view:toggle'](event) {
        event.stopImmediatePropagation();
        toggleTreeView();
      },
      // patch reveal-active-file because it doesn't work
      // when the tree view isn't visible
      ['tree-view:reveal-active-file']() {
        showTreeView(0).then(() =>
          getTreeView().scrollToEntry(getTreeView().getSelectedEntries()[0])
        );
      },
      ['tree-view:toggle-focus']() {
        toggleTreeView();
      },
      ['tree-view:remove']() {
        resizeTreeView();
      },
      ['tree-view:paste']() {
        resizeTreeView();
      },
      ['tree-view:expand-directory']() {
        resizeTreeView();
      },
      ['tree-view:recursive-expand-directory']() {
        resizeTreeView();
      },
      ['tree-view:collapse-directory']() {
        resizeTreeView();
      },
      ['tree-view:recursive-collapse-directory']() {
        resizeTreeView();
      },
      // tree-view-finder package commands
      ['tree-view-finder:toggle']() {
        resizeTreeView().then(() => showTreeView());
      },
    }),

    // hide the tree view when `esc` key is pressed
    atom.commands.add(getTreeViewEl(), 'tool-panel:unfocus', () =>
      hideTreeView()
    ),
  );

  // hide the tree view when a file is opened by a command
  for(let direction of ['', '-right', '-left', '-up', '-down']) {
    disposables.add(atom.commands.add('atom-workspace', `tree-view:open-selected-entry${direction}`, didOpenFile));
  }

  for(let i of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    disposables.add(atom.commands.add('atom-workspace', `tree-view:open-selected-entry-in-pane-${i}`, didOpenFile));
  }

  return disposables;
}

function didOpenFile() {
  process.nextTick(() => {
    storeFocusedElement(atom.views.getView(atom.workspace.getActiveTextEditor()));
    hideTreeView();
  });
}
