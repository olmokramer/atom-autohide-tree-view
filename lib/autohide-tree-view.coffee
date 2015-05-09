'use strict'
{Disposable} = require 'atom'
SubAtom = null

# generic error logging function
error = (e) ->
  console.error e.message, '\n', e.stack

# shallow clone object
clone = (obj) ->
  res = {}
  res[key] = obj[key] for own key of obj
  res

# process.nextTick that returns a promise
promiseNextTick = ->
  new Promise (resolve) ->
    process.nextTick ->
      resolve()

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

    # keep a reference to the package config
    @conf = atom.config.get 'autohide-tree-view'
    {pushEditor} = @conf

    # wait until the tree view package is activated
    atom.packages.activatePackage 'tree-view'
    .then (treeViewPkg) =>
      @registerTreeView treeViewPkg
      @handleEvents()
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
    # apply new pushEditor value, then show the tree view
    @update().then =>
      # show the tree view
      @show 0
    .then =>
      # finally dispose of everything
      @disposables.dispose()
      [@disposables, @conf, @visible] = []
    .catch error

  registerTreeView: (treeViewPkg) ->
    # keep references to the tree view element
    @treeView = treeViewPkg.mainModule.createView()
    @treeViewEl = @treeView.element
    @treeViewEl.classList.add 'autohide'

    # register a disposable that disposes of the references
    # and resets the styles
    @disposables.add new Disposable =>
      @treeViewEl.classList.remove 'autohide', 'autohide-hover'
      @treeViewEl.style.position = ''
      @treeViewEl.style.minWidth = ''
      @treeView.list[0].style.display = ''
      atom.views.getView(@treeView.panel)?.style.width = ''
      [@treeView, @treeViewEl] = []

  handleEvents: ->
    # keep config reference updated
    @disposables.add atom.config.onDidChange 'autohide-tree-view', ({newValue}) => @conf = clone newValue

    # changes to these settings should trigger an update
    @disposables.add atom.config.onDidChange 'autohide-tree-view.pushEditor', => @update()
    @disposables.add atom.config.onDidChange 'autohide-tree-view.hiddenWidth', => @update()
    @disposables.add atom.config.onDidChange 'tree-view.showOnRightSide', => @update()
    @disposables.add atom.config.onDidChange 'tree-view.hideIgnoredNames', => @update()
    @disposables.add atom.config.onDidChange 'tree-view.hideVcsIgnoredFiles', => @update()
    @disposables.add atom.config.onDidChange 'core.ignoredNames', => @update()

    # add listeners for mouse events and update them each time config.showOn gets updated
    mouseEventDisposables = null
    @disposables.add atom.config.observe 'autohide-tree-view.showOn', (value) =>
      # dispose of previously set listeners
      mouseEventDisposables?.dispose()
      @disposables.add mouseEventDisposables = new SubAtom()
      if value.match 'hover'
        # show the tree view when it is hovered
        mouseEventDisposables.add 'atom-workspace', 'mouseenter', '.tree-view-resizer.autohide-hover', => @show()
        mouseEventDisposables.add 'atom-workspace', 'mouseleave', '.tree-view-resizer.autohide-hover', => @hide()
        # disable the tree view from showing/hiding during a selection
        mouseEventDisposables.add 'atom-text-editor', 'mousedown', => @disableHoverEvents()
        mouseEventDisposables.add 'atom-text-editor', 'mouseup', => @enableHoverEvents()
      if value.match 'click'
        # toggle the tree view when it is clicked
        mouseEventDisposables.add 'atom-workspace', 'click', '.tree-view-resizer', (event) => @toggle value is 'click'
        # hide the tree view when another element is focused
        mouseEventDisposables.add '.tree-view', 'blur', =>
          # clear the focused element so the user clicked element will be focused
          @clearFocusedElement()
          @hide 0

    # add listener for core commands that should cause the tree view to hide
    @disposables.add atom.commands.add '.tree-view-resizer.autohide',
      'tool-panel:unfocus': => @hide 0

    # update the tree view when project.paths changes
    @disposables.add atom.project.onDidChangePaths => @resize()

    # respond to tree view commands
    @disposables.add atom.commands.add 'atom-workspace',
      'tree-view:show': (event) =>
        event.stopImmediatePropagation()
        @show 0, true
      'tree-view:hide': (event) =>
        event.stopImmediatePropagation()
        @hide 0
      'tree-view:toggle': (event) =>
        event.stopImmediatePropagation()
        @toggle()
      'tree-view:toggle-focus': => @toggle()
      'tree-view:reveal-active-file': => @show 0, true
      'tree-view:remove': => @resize()
      'tree-view:paste': => @resize()
      'tree-view:expand-directory': => @resize()
      'tree-view:recursive-expand-directory': => @resize()
      'tree-view:collapse-directory': => @resize()
      'tree-view:recursive-collapse-directory': => @resize()

    # resize when opening/closing a directory
    @disposables.add 'atom-workspace', 'mouseup', '.tree-view-resizer .entry.directory', => @resize()

    # hide the tree view when a command opens a file
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

  # updates styling on the .tree-view-resizer and the panel element
  update: ->
    promiseNextTick().then =>
      if @conf.pushEditor
        @treeViewEl.style.position = 'relative'
        atom.views.getView(@treeView.panel)?.style.width = ''
      else
        @treeViewEl.style.position = 'absolute'
        atom.views.getView(@treeView.panel)?.style.width = "#{@conf.hiddenWidth}px"
      @resize()
    .catch error

  # show the tree view
  show: (delay = @conf.showDelay, disableHoverEvents = false) ->
    # disable hover events on the tree view when not triggered
    # by a hover event
    @disableHoverEvents() if disableHoverEvents
    # keep a reference to the currently focused element
    # so we can restore focus when the tree view hides
    @storeFocusedElement()
    # show the content of the tree view
    @treeView.scroller[0].style.display = ''
    @animate @treeView.list[0].clientWidth, delay
    .then (finished) =>
      @visible = true
      # focus the tree view when the animation is done
      @treeView.focus() if finished

  # hide the tree view
  hide: (delay = @conf.hideDelay) ->
    @visible = false
    # enable hover events again
    @enableHoverEvents()
    # focus the element that was focused before the tree view
    # was opened
    @recoverFocus()
    @animate @conf.hiddenWidth, delay
    .then (finished) =>
      # hide the tree view content
      @treeView.scroller[0].style.display = 'none' if finished

  # toggle the tree view
  toggle: (disableHoverEvents = true) ->
    if @visible then @hide 0 else @show 0, disableHoverEvents

  # resize the tree view when its contents might change size
  resize: ->
    promiseNextTick().then =>
      if @visible then @show 0  else @hide 0
    .catch error

  # keep a reference to the currently focused element
  storeFocusedElement: ->
    @focusedElement = document.activeElement

  # clear the reference to the element that was focused
  # when the tree view was opened
  clearFocusedElement: ->
    @focusedElement = null

  # recover focus on the element that was focused when
  # the tree view was opened
  recoverFocus: ->
    return unless @focusedElement?
    if typeof @focusedElement.focused is 'function'
      @focusedElement.focused()
    else if typeof @focusedElement.focus is 'function'
      @focusedElement.focus()
    @clearFocusedElement()

  # enable hover events on the tree view
  enableHoverEvents: ->
    if @conf.showOn.match 'hover'
      @treeViewEl.classList.add 'autohide-hover'

  # disable hover events on the tree view
  disableHoverEvents: ->
    if @conf.showOn.match 'hover'
      @treeViewEl.classList.remove 'autohide-hover'

  # resolves true if animation finished, false if animation cancelled
  animate: (targetWidth, delay) ->
    # get the initial width of the element
    initialWidth = @treeViewEl.clientWidth
    # calculate the animation duration
    duration = Math.abs targetWidth - initialWidth / (@conf.animationSpeed or Infinity)

    # cancel any current animation
    if @currentAnimation? and @currentAnimation.playState isnt 'finished'
      @currentAnimation.cancel()
      @currentAnimation = null
      # if an animation was already occurring, this one
      # should trigger immediately
      delay = 0

    # explicitly set the elements initial width
    # @treeViewEl.style.width = "#{initialWidth}px"
    @treeViewEl.style.width = "#{initialWidth}px"
    new Promise (resolve) =>
      # no animation necessary
      if targetWidth is initialWidth
        return resolve true

      # cache the current animationPlayer so we can
      # cancel it as another animation begins
      @currentAnimation = animation = @treeViewEl.animate [
        {width: initialWidth}
        {width: targetWidth}
      ], {duration, delay}

      animation.onfinish = =>
        # if the animation we resolve with false
        if animation.playState isnt 'finished'
          return resolve false
        # prevent tree view from resetting its width to initialWidth
        @treeViewEl.style.width = "#{targetWidth}px"
        # remove the currentAnimation reference
        @currentAnimation = null
        resolve true
    .catch error

module.exports = new AutohideTreeView()
