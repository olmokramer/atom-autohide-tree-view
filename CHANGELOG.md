## 0.11.4
* Fixed issue where autohide wouldn't enable when opening a project for the first time with the package activated

## 0.11.3
* Fixed issues on startup

## 0.11.2
* Added listeners for a lot more events and commands of the tree view package
* Better handling of tree view events and commands

## 0.11.1
* Fixed readme

## 0.11.0
* Added commands for toggling autohide behavior
* Added keymap to show/hide the tree view that overrides the default `tree-view:toggle` keybinding
* Better handling of keyboard controls
* Improved startup time
* Fixed some minor issues

## 0.10.5
* Fixed the config descriptions

## 0.10.4
* Fix: showDelay would always evaluate to 0

## 0.10.3
* Fix: Unset some css properties upon package deactivation

## 0.10.2
* No delay when opening the tree view while it is collapsing

## 0.10.1
* Fixed changelog

## ~~0.9.0~~ 0.10.0
#### Something went wrong when trying to publish 0.9.0
* Complete rewrite
* Much better control over the animation delays
* Focus/unfocus tree view on show/hide
* Removed `unfoldSpeed` setting as I felt it was unnecessary

## 0.8.1
* Don't allow negative delay

## 0.8.0
* Added `openDelay` setting to adjust when the

## 0.7.3
* Changed default minimized width from 5px to 1px
* Updated readme

## 0.7.2
* Fix: `applyTreeViewSide` was bound to `window` instead of the package object

## 0.7.1
* Hide horizontal scrollbar on the tree view, because we don't need it with `width: auto;`

## 0.7.0
* Added support for `tree-view.showOnRightSide` option

## 0.6.3
* Fix: Git hints in gutter were invisible because they were behind the tree view

## 0.6.2
* Some minor optimization

## 0.6.1
* Fix: Removed config observer for `extraPadding` setting
* Fix: Dispose config observer for `hideDelay` setting on package deactivation

## 0.6.0
* Removed `extraPadding` setting, because it is so trivial to add in `~/.atom/styles.less`

## 0.5.1
* Improved `hideDelay` and `unfoldSpeed` settings

## 0.5.0
* Added `hideDelay` setting to configure the delay before the tree view hides

## 0.4.4
* Update readme image to reflect changes of `0.4.3`

## 0.4.3
* Set `position: absolute;` on the `.tree-view-resizer` so the tree view doesn't push the tabs and editor to the right

## 0.4.2
* Default cursor on the `.tree-view-resize-handle`

## 0.4.1
* Fix: Remove the stylesheet created by this package on package deactivation

## 0.4.0
* Added `extraPadding` option to allow for some more padding on the right side of the tree view, as requested in [`#atom-autohide-tree-view/issues/1`](https://github.com/olmokramer/atom-autohide-tree-view/issues/1)

## 0.3.0
* Added `minimizedWidth` setting to control the width of the minimized tree view

## 0.2.0
* Added `unfoldSpeed` setting to configure the speed with which the tree view (un)folds

## 0.1.1
* Updated readme

## 0.1.0 - First Release
* Every feature added
* Every bug fixed
