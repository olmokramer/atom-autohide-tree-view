module.exports =
  showDelay:
    description: 'The delay  - in seconds - before the tree-view will show.'
    type: 'integer'
    default: 200
    minimum: 0
    order: 0

  hideDelay:
    description: 'The delay - in seconds - before the tree-view will hide.'
    type: 'integer'
    default: 200
    minimum: 0
    order: 1

  hiddenWidth:
    description: 'The width - in pixels - of the tree-view when minimized/hidden.'
    type: 'integer'
    default: 5
    minimum: 1
    order: 2

  animationSpeed:
    description: 'The speed - in 1000 pixels per second - of the sliding animation. Set to 0 to disable animation.'
    type: 'number'
    default: 1
    minimum: 0
    order: 3

  pushEditor:
    description: 'Push the editor to the right when showing the tree view.'
    type: 'boolean'
    default: false
    order: 4

  focusTreeViewOnOpen:
    description: 'Focus the tree view after it opens. Not recommended because it might cause some issues with focusing other parts of the editor.'
    type: 'boolean'
    default: false
    order: 5

  unfocusTreeViewOnClose:
    description: 'Focuses the text editor after closing the tree view. Not recommended because it might cause some issues with focusing other parts of the editor.'
    type: 'boolean'
    default: false
    order: 6