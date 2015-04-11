'use strict'
SubAtom = require 'sub-atom'

class AutohideTreeView
  config: require './config'

  activate: ->
    @disposables = new SubAtom()
    atom.packages.activatePackage('tree-view').then (treeViewPkg) =>
      @treeView = treeViewPkg.mainModule.createView()
      @treeViewEl = atom.views.getView @treeView
      @subscribeEventHandlers()
      @enable()
    .catch (error) ->
      console.error error, error.stack

  deactivate: ->
    @disable()
    @disposables.dispose()
    {@treeView, @treeViewEl} = {}

  subscribeEventHandlers: =>
    @disposables.add atom.config.observe 'autohide-tree-view', (@conf) =>
      @update()
    @disposables.add atom.config.onDidChange 'tree-view.showOnRightSide', =>
      @update()

    @disposables.add atom.commands.add 'atom-workspace',
      'autohide-tree-view:show': =>
        @disableHoverEvents()
        @show true
      'autohide-tree-view:hide': =>
        @hide true
      'autohide-tree-view:toggle-visible': =>
        @toggle()
      'autohide-tree-view:enable': =>
        @enable()
      'autohide-tree-view:disable': =>
        @disable()
      'autohide-tree-view:toggle-enabled': =>
        if @enabled then @disable() else @enable()

    @disposables.add atom.commands.add '.tree-view-resizer.autohide', 'core:cancel', =>
      @hide true

    @disposables.add 'atom-workspace', 'mouseenter', '.tree-view-resizer.autohide-hover', =>
      @show()
    @disposables.add 'atom-workspace', 'mouseleave', '.tree-view-resizer.autohide-hover', =>
      @hide()

    @disposables.add atom.commands.add 'atom-workspace',
      'tree-view:expand-directory': @openEntry
      'tree-view:recursive-expand-directory': @openEntry
      'tree-view:collapse-directory': @openEntry
      'tree-view:recursive-collapse-directory': @openEntry
      'tree-view:open-selected-entry': @openEntry
      'tree-view:open-selected-entry-right': @openEntry
      'tree-view:open-selected-entry-left': @openEntry
      'tree-view:open-selected-entry-up': @openEntry
      'tree-view:open-selected-entry-down': @openEntry
      'tree-view:open-selected-entry-in-pane-1': @openEntry
      'tree-view:open-selected-entry-in-pane-2': @openEntry
      'tree-view:open-selected-entry-in-pane-3': @openEntry
      'tree-view:open-selected-entry-in-pane-4': @openEntry
      'tree-view:open-selected-entry-in-pane-5': @openEntry
      'tree-view:open-selected-entry-in-pane-6': @openEntry
      'tree-view:open-selected-entry-in-pane-7': @openEntry
      'tree-view:open-selected-entry-in-pane-8': @openEntry
      'tree-view:open-selected-entry-in-pane-9': @openEntry

    @disposables.add 'atom-workspace', 'mouseup', '.tree-view-resizer .entry', (e) =>
      process.nextTick => @openEntry e

  enable: =>
    @enabled = true
    @treeViewEl.classList.add 'autohide'
    @hide(true)
    @update()

  disable: =>
    @enabled = false
    treeViewWidth = @treeViewEl.querySelector('.tree-view').clientWidth
    @treeViewEl.classList.remove 'autohide', 'autohide-hover'
    @treeViewEl.style.width = "#{treeViewWidth}px"
    @treeViewEl.parentNode?.style?.width = ''

  update: =>
    if @conf.pushEditor
      @treeViewEl.style.position = 'relative'
      @treeViewEl.parentNode?.style?.width = ''
    else
      @treeViewEl.style.position = 'fixed'
      @treeViewEl.parentNode?.style?.width = "#{@conf.hiddenWidth}px"

  show: (noDelay = false) ->
    targetWidth = @treeViewEl.querySelector('.tree-view').clientWidth
    delay = !noDelay * @conf.showDelay
    @animate targetWidth, delay
    @visible = true
    if @conf.focusTreeViewOnOpen
      @treeView.focus()

  hide: (noDelay = false) ->
    targetWidth = @conf.hiddenWidth
    delay = !noDelay * @conf.hideDelay
    @animate targetWidth, delay
    @visible = false
    @enableHoverEvents()
    if @conf.unfocusTreeViewOnClose
      @treeView.unfocus()

  toggle: =>
    if @enabled
      @disableHoverEvents()
      if @visible then @hide true else @show true
    else
      atom.commands.dispatch atom.views.getView(atom.workspace), 'tree-view:toggle'

  openEntry: (e) =>
    if @treeView.selectedEntry().classList.contains 'directory'
      @show true
    else if e.type isnt 'mouseup'
      @hide true

  animate: (targetWidth, delay) ->
    initialWidth = @treeViewEl.clientWidth
    duration = Math.abs(targetWidth - initialWidth) / (@conf.animationSpeed or Infinity)
    if @currentAnimation?
      @currentAnimation.cancel()
      @treeViewEl.style.width = "#{initialWidth}px"
      delay = 0
    @currentAnimation = @treeViewEl.animate [
      {width: initialWidth}
      {width: targetWidth}
    ], {duration, delay}
    @currentAnimation.onfinish = =>
      @treeViewEl.style.width = "#{targetWidth}px"
      @currentAnimation = null

  enableHoverEvents: =>
    @treeViewEl.classList.add 'autohide-hover'

  disableHoverEvents: =>
    @treeViewEl.classList.remove 'autohide-hover'

module.exports = new AutohideTreeView()
