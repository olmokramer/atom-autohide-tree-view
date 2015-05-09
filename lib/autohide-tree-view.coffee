'use strict'
SubAtom = null

# generic error logging function
error = (e) ->
  console.error e.message, '\n', e.stack

clone = (obj) ->
  res = {}
  res[key] = obj[key] for own key of obj
  res

promiseNextTick = (cb) ->
  new Promise (resolve) ->
    process.nextTick ->
      resolve()
  .then cb

class AutohideTreeView
  config:
    showOn:
      description: 'The type of event that triggers the tree view to show or hide.'
      type: 'string'
      default: 'hover'
      enum: [
        'hover'
        'click'
        'hover + click'
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

  activate: ->
    SubAtom ?= require 'sub-atom'
    @disposables = new SubAtom()
    @conf = atom.config.get 'autohide-tree-view'
    {pushEditor} = @conf

    # wait until the tree view package is activated
    atom.packages.activatePackage('tree-view').then (treeViewPkg) =>
      @registerTreeView treeViewPkg
      @observe()
      # start with pushEditor = true, we'll change it back later
      # activating the package looks much better this way
      @conf.pushEditor = true
      @update()
    .then =>
      # reset the pushEditor setting to the user value
      @conf.pushEditor = pushEditor
      @update()
    .catch error

  deactivate: ->
    # deactivating looks better with pushEditor = true
    @conf.pushEditor = true
    # the stylesheet will be removed before the animation is finished
    # so set minWidth on the element
    @treeViewEl.style.minWidth = '1px'
    @update().then =>
      # show the tree view
      @show 0
    .then =>
      @disposables.dispose()
      [@disposables, @conf, @visible] = []
    .catch error

  registerTreeView: (treeViewPkg) ->
    @treeView = treeViewPkg.mainModule.createView()
    @treeViewEl = @treeView.element
    @treeViewEl.classList.add 'autohide', 'autohide-hover'

    @disposables.add new Disposable =>
      @treeViewEl.classList.remove 'autohide', 'autohide-hover'
      @treeViewEl.style.position = ''
      @treeViewEl.style.minWidth = ''
      @treeViewEl.parentNode?.style?.width = ''
      @treeViewEl.querySelector('.tree-view-scroller').style.display = ''
      [@treeView, @treeViewEl] = []

  observe: ->
    # observe config
    @disposables.add atom.config.onDidChange 'autohide-tree-view', ({newValue}) => @conf = clone newValue
    @disposables.add atom.config.onDidChange 'autohide-tree-view.pushEditor', => @update()
    @disposables.add atom.config.onDidChange 'autohide-tree-view.hiddenWidth', => @update()
    @disposables.add atom.config.onDidChange 'tree-view.showOnRightSide', => @update()

    # add listeners for commands
    @disposables.add atom.commands.add 'atom-workspace',
      'autohide-tree-view:show': => @show 0, true
      'autohide-tree-view:hide': => @hide 0
      'autohide-tree-view:toggle': => @toggle()

    # add listeners for mouse events
    @disposables.add atom.config.observe 'autohide-tree-view.showOn', do =>
      disposables = null

      (value) =>
        disposables?.dispose()
        @disposables.add disposables = new SubAtom()
        if value.match 'hover'
          disposables.add 'atom-workspace', 'mouseenter', '.tree-view-resizer.autohide-hover', => @show()
          disposables.add 'atom-workspace', 'mouseleave', '.tree-view-resizer.autohide-hover', => @hide()
        if value.match 'click'
          disposables.add 'atom-workspace', 'click', '.tree-view-resizer', (event) => @toggle value is 'click'
          disposables.add '.tree-view', 'blur', =>
            @clearFocusedElement()
            @hide 0

    # disable the tree view from showing during a selection
    @disposables.add 'atom-text-editor', 'mousedown', => @disableHoverEvents()
    @disposables.add 'atom-text-editor', 'mouseup', => @enableHoverEvents()

    # add listener for core commands that should cause the tree view to hide
    @disposables.add atom.commands.add '.tree-view-resizer.autohide',
      'core:cancel': => @hide 0
      'tool-panel:unfocus': => @hide 0

    # respond to tree view commands
    @disposables.add atom.commands.add 'atom-workspace',
      'tree-view:toggle': => @update()
      'tree-view:show': => @update()
      'tree-view:toggle-side': => @update()
      'tree-view:reveal-active-file': => @show 0, true

    # these tree-view commands should trigger a resize
    @disposables.add atom.commands.add 'atom-workspace',
      'tree-view:expand-directory': => @resize()
      'tree-view:recursive-expand-directory': => @resize()
      'tree-view:collapse-directory': => @resize()
      'tree-view:recursive-collapse-directory': => @resize()
      'tree-view:toggle-vcs-ignored-files': => @resize()
      'tree-view:toggle-ignored-names': => @resize()
      'tree-view:remove-project-folder': => @resize()

    @disposables.add 'atom-workspace', 'mouseup', '.tree-view-resizer .entry.directory', => @resize()

    # these commands cause the tree view to hide
    for direction in ['', '-right', '-left', '-up', '-down']
      @disposables.add atom.commands.add 'atom-workspace',
        "tree-view:open-selected-entry#{direction}", => @hide 0

    for i in [1...10]
      @disposables.add atom.commands.add 'atom-workspace',
        "tree-view:open-selected-entry-in-pane-#{i}", => @hide 0

    # these commands create a dialog that should keep focus
    for command in ['add-file', 'add-folder', 'duplicate', 'rename', 'move']
      @disposables.add atom.commands.add 'atom-workspace',
        "tree-view:#{command}", => @clearFocusedElement()

  update: ->
    promiseNextTick =>
      return false unless @treeViewEl.parentNode?
      if @conf.pushEditor
        @treeViewEl.style.position = 'relative'
        @treeViewEl.parentNode.style.width = ''
      else
        @treeViewEl.style.position = 'absolute'
        @treeViewEl.parentNode.style.width = "#{@conf.hiddenWidth}px"
      @resize().catch error

  show: (delay = @conf.showDelay, disableHoverEvents = false) ->
    @disableHoverEvents() if disableHoverEvents
    @storeFocusedElement()
    @treeViewEl.querySelector('.tree-view-scroller').style.display = ''
    targetWidth = @treeViewEl.querySelector('.tree-view').clientWidth
    @animate(targetWidth, delay).then (finished) =>
      @visible = true
      @treeView.focus() if finished

  hide: (delay = @conf.hideDelay) ->
    @visible = false
    @enableHoverEvents()
    @recoverFocus()
    targetWidth = @conf.hiddenWidth
    @animate(targetWidth, delay).then (finished) =>
      @treeViewEl.querySelector('.tree-view-scroller').style.display = 'none' if finished

  toggle: (disableHoverEvents = true) ->
    if @visible then @hide 0 else @show 0, disableHoverEvents

  resize: ->
    promiseNextTick =>
      if @visible then @show(0) else @hide(0)
    .catch error

  storeFocusedElement: ->
    @focusedElement = document.activeElement

  clearFocusedElement: ->
    @focusedElement = null

  recoverFocus: ->
    return unless @focusedElement?
    if typeof @focusedElement.focused is 'function'
      @focusedElement.focused()
    else if typeof @focusedElement.focus is 'function'
      @focusedElement.focus()
    @focusedElement = null

  enableHoverEvents: ->
    @treeViewEl.classList.add 'autohide-hover'

  disableHoverEvents: ->
    @treeViewEl.classList.remove 'autohide-hover'

  # resolves true if animation finished, false if animation cancelled
  animate: (targetWidth, delay) ->
    initialWidth = @treeViewEl.clientWidth
    duration = Math.abs(targetWidth - initialWidth) / (@conf.animationSpeed or Infinity)

    if @currentAnimation? and @currentAnimation.playState isnt 'finished'
      @currentAnimation.cancel()
      @currentAnimation = null
      delay = 0

    @treeViewEl.style.width = "#{initialWidth}px"
    new Promise (resolve) =>
      if targetWidth is initialWidth
        return resolve true

      @currentAnimation = animation = @treeViewEl.animate [
        {width: initialWidth}
        {width: targetWidth}
      ], {duration, delay}

      animation.onfinish = =>
        if animation.playState isnt 'finished'
          return resolve false
        @treeViewEl.style.width = "#{targetWidth}px"
        @currentAnimation = null
        resolve true
    .catch error

module.exports = new AutohideTreeView()
