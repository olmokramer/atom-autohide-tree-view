'use strict'
{Disposable} = require 'atom'
SubAtom = require 'sub-atom'

class AutohideTreeView
  config: require './config'

  activate: ->
    @conf = atom.config.get 'autohide-tree-view'
    @disposables = new SubAtom()

    atom.packages.activatePackage('tree-view').then (treeViewPkg) =>
      @disposables.add @registerTreeView treeViewPkg
      @init()
    .catch (error) ->
      atom.notifications.addError error.message

  deactivate: ->
    @conf.pushEditor = true
    @treeViewEl.style.minWidth = '1px'
    @update().then =>
      @show(0).then =>
        @disposables.dispose()
        [@disposables, @conf] = []

  registerTreeView: (treeViewPkg) ->
    @treeView = treeViewPkg.mainModule.createView()
    @treeViewEl = @treeView.element
    @treeViewScroller = @treeView.scroller[0]
    @treeViewList = @treeView.list[0]
    @treeViewEl.classList.add 'autohide', 'autohide-hover'

    new Disposable =>
      @treeViewEl.classList.remove 'autohide', 'autohide-hover'
      @treeViewEl.style.position = ''
      @treeViewEl.style.minWidth = ''
      @treeViewEl.parentNode?.style?.width = ''
      @treeViewScroller.style.display = ''
      [@treeView, @treeViewEl, @treeViewScroller, @treeViewList] = []

  init: ->
    @observe()
    {pushEditor} = @conf
    @conf.pushEditor = true
    @update().then =>
      @conf.pushEditor = pushEditor
      @update()

  observe: ->
    # observe config
    @disposables.add atom.config.onDidChange 'autohide-tree-view', ({newValue: @conf}) => @update()
    @disposables.add atom.config.onDidChange 'tree-view.showOnRightSide', => @update()

    # add listeners for commands
    @disposables.add atom.commands.add 'atom-workspace',
      'autohide-tree-view:show': => @toggle true
      'autohide-tree-view:hide': => @toggle false
      'autohide-tree-view:toggle': => @toggle()

    # add listeners for mouse events
    @disposables.add 'atom-workspace', 'mouseenter', '.tree-view-resizer.autohide-hover', => @show()
    @disposables.add 'atom-workspace', 'mouseleave', '.tree-view-resizer.autohide-hover', => @hide()
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
      'tree-view:reveal-active-file': => @toggle true

    # these tree-view commands should trigger a resize
    @disposables.add atom.commands.add 'atom-workspace',
      'tree-view:expand-directory', => @resize()
      'tree-view:recursive-expand-directory', => @resize()
      'tree-view:collapse-directory', => @resize()
      'tree-view:recursive-collapse-directory', => @resize()
      'tree-view:toggle-vcs-ignored-files', => @resize()
      'tree-view:toggle-ignored-names', => @resize()
      'tree-view:remove-project-folder', => @resize()

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
        "tree-view:#{command}", => @activeElement = null

  update: ->
    new Promise (resolve) => process.nextTick =>
      unless @treeViewEl.parentNode?
        return resolve false
      if @conf.pushEditor
        @treeViewEl.style.position = 'relative'
        @treeViewEl.parentNode.style.width = ''
      else
        @treeViewEl.style.position = 'fixed'
        @treeViewEl.parentNode.style.width = "#{@conf.hiddenWidth}px"
      @hide(0).then resolve

  show: (delay = @conf.showDelay) ->
    @visible = true
    @activeElement = document.activeElement
    @treeViewScroller.style.display = ''
    @animate(@treeViewList.clientWidth, delay).then (finished) =>
      @treeView.focus() if finished

  hide: (delay = @conf.hideDelay) ->
    @visible = false
    @enableHoverEvents()
    @recoverFocus()
    @animate(@conf.hiddenWidth, delay).then (finished) =>
      @treeViewScroller.style.display = 'none' if finished

  toggle: (visible = !@visible) ->
    @disableHoverEvents()
    if visible then @show 0 else @hide 0

  resize: ->
    new Promise (resolve) => process.nextTick =>
      @show(0).then(resolve)

  recoverFocus: ->
    return unless @activeElement?
    if typeof @activeElement.focused is 'function'
      @activeElement.focused()
    else if typeof @activeElement.focus is 'function'
      @activeElement.focus()
    @activeElement = null

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
      delay = 0

    @treeViewEl.style.width = "#{initialWidth}px"
    new Promise (resolve, reject) =>
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
        resolve true

module.exports = new AutohideTreeView()
