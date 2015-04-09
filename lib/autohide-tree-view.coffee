'use strict'
SubAtom = require 'sub-atom'

class AutohideTreeView
  config: require './config'

  activate: ->
    @disposables = new SubAtom()
    atom.packages.activatePackage('tree-view').then (treeViewPkg) =>
      @treeView = treeViewPkg.mainModule.createView()
      @treeViewResizerEl = atom.views.getView @treeView
      @treeViewEl = @treeViewResizerEl.querySelector '.tree-view'
      @subscribeEventHandlers()
      @enable()
    .catch (error) ->
      console.error error, error.stack

  deactivate: ->
    @disable()
    @disposables.dispose()
    {@treeView, @treeViewResizerEl, @treeViewEl} = {}

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
        if @enabled
          @disableHoverEvents()
          @toggle()
        else
          atom.commands.dispatch atom.views.getView(atom.workspace), 'tree-view:toggle'
      'autohide-tree-view:enable': =>
        @enable()
      'autohide-tree-view:disable': =>
        @disable()
      'autohide-tree-view:toggle-enabled': =>
        if @enabled then @disable() else @enable()

    @disposables.add atom.commands.add '.tree-view.autohide', 'core:cancel', =>
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
    @treeViewResizerEl.classList.add 'autohide'
    @hide(true)
    @update()

  disable: =>
    @enabled = false
    @treeViewResizerEl.classList.remove 'autohide', 'autohide-hover'
    @treeViewResizerEl.style.width = "#{@treeViewEl.clientWidth}px"
    @treeViewResizerEl.parentNode?.style?.width = ''

  update: =>
    if @conf.pushEditor
      @treeViewResizerEl.style.position = 'relative'
      @treeViewResizerEl.parentNode?.style?.width = ''
    else
      @treeViewResizerEl.style.position = 'absolute'
      @treeViewResizerEl.parentNode?.style?.width = "#{@conf.hiddenWidth}px"

  show: (noDelay = false) ->
    if @conf.hiddenWidth < @treeViewResizerEl.clientWidth < @treeViewEl.clientWidth
      noDelay = true
    setTimeout =>
      @visible = true
      @animate @treeViewEl.clientWidth
    , Number(!noDelay) * @conf.showDelay
    if @conf.focusTreeViewOnOpen
      @treeView.focus()

  hide: (noDelay = false) ->
    if @conf.hiddenWidth < @treeViewResizerEl.clientWidth < @treeViewEl.clientWidth
      noDelay = true
    setTimeout =>
      @visible = false
      @animate @conf.hiddenWidth
    , Number(!noDelay) * @conf.hideDelay
    @enableHoverEvents()
    if @conf.unfocusTreeViewOnClose
      @treeView.unfocus()

  toggle: =>
    if @visible
      @hide()
    else
      @show()

  openEntry: (e) =>
    if @treeView.selectedEntry().classList.contains 'directory'
      @show true
    else if e.type isnt 'mouseup'
      @hide true

  animate: do ->
    animation = null

    nextFrame = ->
      {start, duration, initialWidth, targetWidth} = animation
      animation.rafHandle = requestAnimationFrame nextFrame.bind @
      progress = (Date.now() - animation.start) / animation.duration
      if 1 <= progress
        progress = 1
        cancelAnimationFrame animation.rafHandle
        animation = null
      @treeViewResizerEl.style.width = "#{initialWidth + (targetWidth - initialWidth) * progress}px"

    (targetWidth) ->
      if animation?.rafHandle?
        cancelAnimationFrame animation.rafHandle
      initialWidth = @treeViewResizerEl.clientWidth
      start = Date.now()
      duration = Math.abs (targetWidth - initialWidth) / (@conf.animationSpeed or Infinity)
      rafHandle = requestAnimationFrame nextFrame.bind @
      animation = {targetWidth, initialWidth, start, duration, rafHandle}


  enableHoverEvents: =>
    @treeViewResizerEl.classList.add 'autohide-hover'

  disableHoverEvents: =>
    @treeViewResizerEl.classList.remove 'autohide-hover'

module.exports = new AutohideTreeView()