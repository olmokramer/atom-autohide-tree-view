'use babel';
import {CompositeDisposable} from 'atom';
import {treeView, treeViewEl} from './main.js';
import {showTreeView, hideTreeView, toggleTreeView,
  storeFocusedElement, resizeTreeView} from './autohide-tree-view.js';

export default function initCommands() {
  var disposables = new CompositeDisposable(
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
      // but have it here for the sake of symmetry :)
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
          treeView.scrollToEntry(treeView.getSelectedEntries()[0])
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
    }),

    // hide the tree view when `esc` key is pressed
    atom.commands.add(treeViewEl, 'tool-panel:unfocus', () =>
      hideTreeView()
    ),
  );

  for(let action of ['expand', 'collapse']) {
    disposables.add(atom.commands.add('atom-workspace', {
      [`tree-view:${action}-directory`]: resizeTreeView,
      [`tree-view:recursive-${action}-directory`]: resizeTreeView,
    }));
  }

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
