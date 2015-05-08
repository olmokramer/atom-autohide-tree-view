module.exports =
  showOn:
    description: 'The type of event that triggers the tree view to show.'
    type: 'string'
    default: 'hover'
    enum: [
      'hover'
      'click'
      'both'
      'none'
    ]
    order: 0

  showDelay:
    description: 'The delay in seconds before the tree-view will show. Only when show is triggered by a hover event.'
    type: 'integer'
    default: 200
    minimum: 0
    order: 1

  hideDelay:
    description: 'The delay in seconds before the tree-view will hide. Only when hide is triggered by a hover event.'
    type: 'integer'
    default: 200
    minimum: 0
    order: 2

  hiddenWidth:
    description: 'The width in pixels of the tree-view when hidden.'
    type: 'integer'
    default: 5
    minimum: 1
    order: 3

  animationSpeed:
    description: 'The speed in 1000 pixels per second of the sliding animation. Set to 0 to disable animation.'
    type: 'number'
    default: 1
    minimum: 0
    order: 4

  pushEditor:
    description: 'Keep the entire editor visible when showing the tree view.'
    type: 'boolean'
    default: false
    order: 5