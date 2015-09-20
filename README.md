# autohide-tree-view package

Hide the tree view, show it on hover.

![](https://raw.githubusercontent.com/olmokramer/atom-autohide-tree-view/master/screencast.gif)

## Config

| setting | type | unit | default | description |
| --- | --- | --- | --- | --- |
| `showOn` | string | none | hover | The type of event that should trigger show/hide of the tree view. `Hover`, `Click`, `Touch` (or any combination) or `None`. |
| `animate` | boolean | none | true | Enable/disable the animation when showing the menu |
| `showDelay` | number | seconds | 0.2 | The delay before the tree view will show when hovered |
| `hideDelay` | number | seconds | 0.2 | The delay before the tree view will hide when hovered |
| `minwidth` | integer | pixels | 1 | The width of the hidden tree view |
| `pushEditor` | boolean | none | false | Push the editor when showing the tree view |
| `hoverAreasize` | integer | pixels | 0 | Width of an invisible area at the edge of the screen where hover events will be triggered. When smaller than the value of the minwidth setting, minwidth will be used. |
| `touchAreaSize` | integer | pixels | 50 | Width of an invisible area at the edge of the screen where touch events will be triggered. |
| `maxWindowWidth` | integer | pixels | 0 | Max window width for which autohide should be enabled. If on a resize the window width crosses this threshold, autohide will automatically be enabled or disabled. Set to 0 to always have autohide enabled. |
| `showPinButton` | boolean | none | true | Show a pin button in the tree view that enables/disables autohide. |
| `autoFocusTreeViewOnHover` | boolean | none | true | Focus and unfocus the tree view on hover events. This setting exists because some people were experiencing issues with the tree view's add/rename dialogs where the dialogs would close almost immediately after opening. See #28 for more details. |

## Touch events

Show/hide the tree view with swiping gestures. For touch events, the [atom-touch-events](https://atom.io/packages/atom-touch-events) package is required. You'll have to re-enable autohide-tree-view, or reload Atom, after installing atom-touch-events for the touch events to work.

## Services provided

autohide-tree-view provides a service for Show, Hide, Enable and Disable actions. To consume the service, put the following in your package's `package.json`:

```json
"consumedServices": {
  "autohide-tree-view": {
    "versions": {
      // refers to the consumer method in your package's main module
      "^0.24.0": "consumeAutohideTreeViewService"
    }
  }
}
```

And in your package's main module, put this:

```coffee
consumeAutohideTreeViewService: (service) ->
  # show/hide the tree view
  # @param delay: delay in ms before starting the animation
  service.show(delay)
  service.hide(delay)
  service.isVisible()

  # enable/disable autohide behaviour
  service.pin()
  service.unpin()
  service.isPinned()
```

The `show`, `hide`, `pin` and `unpin` methods return a promise that will be resolved once the tree view animation is done. It's resolved value is a boolean, indicating if the animation was finished (`true`) or cancelled (`false`). The promise is rejected if an error occurs during the animation.

`isVisible` and `isPinned` return a boolean, indicating whether the tree view is visible or pinned.

A silly example:

```js
// open the tree view, and hide it again if
// it wasn't cancelled
function consumeAutohideTreeViewService(service) {
  service.show(0).then(function(finished) {
    if(finished) {
      service.hide();
    }
  }, function(err) {
    // something went wrong!!
    console.error(err);
  });
}
```

## Issues/suggestions

Please file issues or suggestions on the [issues page on github](https://github.com/olmokramer/atom-autohide-tree-view/issues/new), or even better, [submit a pull request](https://github.com/olmokramer/atom-autohide-tree-view/pulls)

## License

&copy; 2015 Olmo Kramer <br> [MIT License](LICENSE.md)
