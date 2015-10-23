# autohide-tree-view changelog

## 0.25.1
* Slight performance improvements
* Fix bug where hover events didn't work sometimes

## 0.25.0
* Disable autohide when there are no open files (#52)

## 0.24.5
* Fix `maxWindowWidth` setting
* Fix `autohide-tree-view:pin`, `autohide-tree-view:unpin` and `autohide-tree-view:toggle-pinned` commands

## 0.24.4
* Fix some focusing issues (#43, #28)
* Set z-index of the tree view very high to fix tabs rendering above the tree view in some UI themes (#51)
* Show a warning when enabling touch events without having the atom-touch-events package installed
* Change default for the `showOn` setting from `hover + touch` to `touch` to prevent error messages from showing when you don't have the atom-touch-events package installed
* Fix a crash when pinning the tree view when touch events are enabled
* Fix the `autohide-tree-view:toggle-push-editor` command
* Upgrade atom-touch-events' service to 0.21.0

## 0.24.3
* Fix crash when atom-touch-events isn't installed (#47)

## 0.24.2
* Better visual differentiation between pinned/unpinned state (#41)
* Fix crash

## 0.24.1
* Listen only to primary mouse button events (#28)
* Fix crash when atom-touch-events package isn't active (#32, #36, #44, #47)

## 0.24.0
* Update service API:
  * Rename `enable`, `disable` and `isEnabled` to `pin`, `unpin` and `isPinned`, respectively
* Fix focusing issues when opening a file that's already open in the workspace (#37)

## 0.23.3
* Fix focusing issues when opening files (#37)

## 0.23.2
* Improve `tree-view:reveal-active-file` command (#39)
* Fix issue where hover events were disabled when they shouldn't (#38, #40)

## 0.23.1
* Improve `tree-view:reveal-active-file` command behaviour
* Hide the tree view in some situations where it is expected
* Improve hover events
* Ensure all animations are cancelable, preventing weird glitches
* Fix some edge cases

## 0.23.0
* Add `maxWidth` setting (#30, #34, #35)
* Rename `hiddenWidth` setting to `minWidth`
* Expand tree view to width of widest `.list-tree` element (#30)
* Allow manual resizing of the tree view
* Allow horizontal scrolling (#34, #35)
* Prevent modal panels from instantly closing (#28)
* Fix the animation when pinning the tree view and `pushEditor` is disabled (#20)
* Fix issues with the `pushEditor` setting (#32)
* Improve click events

## 0.22.1
* Fix issue where the `.tree-view-autohide-hover-area` would block the items below it (#33)

## 0.22.0
* Add `hoverAreaSize` setting (#25)
* Add pin button (#20)

## 0.21.1
* Fix: revert service provider name

## 0.21.0
* Service provider now also provides `isEnabled` and `isVisible` methods that indicate if autohide is enabled, and if the tree view is visible.
* Add `autohide-tree-view:toggle-enabled` command

## 0.20.3
* Adjust tree view height to not cover the status bar when `pushEditor` is disabled

## 0 20.2
* Fix issue where `showDelay` and `hideDelay` could be ignored due to a race condition.

## 0.20 1
* Fix bug where tree view wouldn't open correctly on `tree-view:reveal-active-file` command (#22)
* Better blur behaviour
* Add support for [tree-view-finder](https://atom.io/packages/tree-view-finder) package

## 0.20.0
* Add touch event support (requires [atom-touch-events](https://atom.io/packages/atom-touch-events))
* Provide service to show/hide the tree view
* Provide service to enable/disable autohide behaviour
* Fix issue with updating the `hiddenWidth` config
* Add `maxWindowWidth` setting, that enables autohide behavior only when the window is smaller than this setting. (#21)

## 0.19.2
* Fix animation duration calculation
* Fix issue where animation wasn't cancelled in certain situations

## 0.19.1
* Cleanup and some minor improvements

## 0.19.0
* Fix issue where the package doesn't activate properly when the project has no serialized state
* Remove own commands in favor of the tree-view package commands. Use `tree-view:show|hide|toggle` instead of `autohide-tree-view:show|hide|toggle`
* Respond to even more commands and events
* Slightly improve loading time
* Changed config values for the `showOn` setting

## 0.18.0
* Prevent the tree view from opening while selecting text in the editor
* Add `openOn` setting
* Fix a few minor issues

## 0.17.1
* Prevent an exception (#18)

## 0.17.0
* Fix focusing issues
* Respond to many more commands
* Remove `focusTreeViewOnOpen` and `unfocusTreeViewOnClose` settings
* Fix some minor visual issues

## 0.16.5
* Fix #16 when `pushEditor` enabled
* Fix `core:cancel` command on the tree view

## 0.16.4
* Fix #16

## 0.16.3
* Use native web animations (`Element::animate`)

## 0.16.2
* Minor improvements in hiding/closing behavior

## 0.16.1
* Fix #15

## 0.16.0
* Complete rewrite
* Replace setting `animate` with `animationSpeed`
* Rename command `autohide-tree-view:toggle-visible` `autohide-tree-view:toggle`
* Change unit of settings `showDelay` and `hideDelay` from seconds to milliseconds
* Remove focusing and unfocusing tree view

## 0.15.5
* Removed `hideOnUnfocus` option because it was causing trouble

## 0.15.4
* Fixed issue where blurring the tree-view would actually focus the editor

## 0.15.3
* Fixed issue where tree view would overlap the editor after changing the `hiddenWidth` setting

## 0.15.2
* Fixed some errors

## 0.15.1
* Fixed issue where the tree view would remain positioned absolute after disabling the package

## 0.15.0
* Added `pushEditor` setting to fix #10

## 0.14.3
* Altered config description

## 0.14.2
* Added `hideOnFocus` setting to fix #9

## 0.14.1
* Fixed issue where commands weren't disposed of

## 0.14.0
* Fixed #6 and #7

## ~~0.13.1~~ 0.13.2
* Fixed issue where package wouldn't do anything when disabled and enabled again from the settings view

## 0.13.0
* Improved initialization

## 0.12.3
* Fixed issue where the resizing the tree view looked weird when `autohide-tree-view` is disabled

## 0.12.2
* Hopefully fixed #6 and #7

## 0.12.1
* Hopefully fixed #6 and #7

## 0.12.0
* Added `animate` setting

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
