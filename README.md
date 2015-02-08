# autohide-tree-view package

Hides most of the tree view, show it on hover. The tree view is focused (so you can control it with the keyboard) when it is revealed.

![Image inserted by Atom editor package auto-host-markdown-image](https://raw.githubusercontent.com/olmokramer/atom-autohide-tree-view/master/images/screencast.gif)

## Config

| setting | type | unit | default | description |
|---|---|---|---|
| `animate` | boolean |  | true | Enable/disable the animation when showing the menu |
| `showDelay` | number | s (seconds) | 0.2 | The delay before the tree view will show when hovered |
| `hideDelay` | number | s (seconds) | 0.2 | The delay before the tree view will hide when hovered |
| `hiddenWidth` | integer | px (pixels) | 1 | The width of the hidden tree view |

## Commands

| command | scope-selector:keybinding | description |
|---|---|---|
| `autohide-tree-view:enable` | none | Enable autohide behavior on the tree view |
| `autohide-tree-view:disable` | none | Enable default tree view behavior |
| `autohide-tree-view:toggle-enabled` | none | Enable/Disable |
| `autohide-tree-view:show` | none | Show the tree view |
| `autohide-tree-view:hide` | `.tree-view-resizer.autohide.unfolded`: <kbd>Escape</kbd> | Hide the tree view |
| `autohide-tree-view:toggle-visible` | `atom-workspace`: <kbd>CtrlOrCmd-\\</kbd> | Toggle between showing/hiding the tree view |

## Issues/suggestions

Please file issues or suggestions on the [issues page on github](https://github.com/olmokramer/autohide-tree-view/issues/new), or even better, [submit a pull request](https://github.com/olmokramer/atom-autohide-tree-view/pulls)

## License

`autohide-tree-view` is released under the [MIT License](LICENSE.md)<br>
&copy; 2015 Olmo Kramer