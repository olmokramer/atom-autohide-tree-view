'use strict'
{basename} = require 'path'
{Disposable} = require 'atom'
SubAtom = require 'sub-atom'

class AutohideTreeView
  {treeViewModel, treeViewResizerEl, treeViewEl} = {}

  config:
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

  activate: (state) ->
    atom.packages.onDidActivateInitialPackages @initialize

  deactivate: ->
    @initialized = false
    @disable()
    @subs.dispose()

  initialize: =>
    return if @initialized
    @initialized = true

    @subs = new SubAtom()

    @subs.add atom.config.observe 'autohide-tree-view', @update
    @subs.add atom.config.observe 'tree-view.showOnRightSide', => @update()

    registerCommand = (command, cb, namespace = 'autohide-tree-view') =>
      @subs.add atom.commands.add 'atom-workspace', "#{namespace}:#{command}", cb

    registerCommand 'show', =>
      @disableHoverEvents()
      @show(true)
    registerCommand 'hide', =>
      @hide(true)
    registerCommand 'toggle-visible', =>
      if @enabled
        @disableHoverEvents()
        @toggle()
      else
        atom.commands.dispatch atom.views.getView(atom.workspace), 'tree-view:toggle'
    registerCommand 'enable', @enable
    registerCommand 'disable', @disable
    registerCommand 'toggle-enabled', =>
      if @enabled then @disable() else @enable()

    @subs.add 'atom-workspace', 'mouseenter', '.tree-view-resizer.autohide-hover', => @show()
    @subs.add 'atom-workspace', 'mouseleave', '.tree-view-resizer.autohide-hover', => @hide()

    registerCommand 'expand-directory', @openEntry, 'tree-view'
    registerCommand 'recursive-expand-directory', @openEntry, 'tree-view'
    registerCommand 'collapse-directory', @openEntry, 'tree-view'
    registerCommand 'recursive-collapse-directory', @openEntry, 'tree-view'
    registerCommand 'open-selected-entry', @openEntry, 'tree-view'
    registerCommand 'open-selected-entry-right', @openEntry, 'tree-view'
    registerCommand 'open-selected-entry-left', @openEntry, 'tree-view'
    registerCommand 'open-selected-entry-up', @openEntry, 'tree-view'
    registerCommand 'open-selected-entry-down', @openEntry, 'tree-view'
    registerCommand 'open-selected-entry-in-pane-1', @openEntry, 'tree-view'
    registerCommand 'open-selected-entry-in-pane-2', @openEntry, 'tree-view'
    registerCommand 'open-selected-entry-in-pane-3', @openEntry, 'tree-view'
    registerCommand 'open-selected-entry-in-pane-4', @openEntry, 'tree-view'
    registerCommand 'open-selected-entry-in-pane-5', @openEntry, 'tree-view'
    registerCommand 'open-selected-entry-in-pane-6', @openEntry, 'tree-view'
    registerCommand 'open-selected-entry-in-pane-7', @openEntry, 'tree-view'
    registerCommand 'open-selected-entry-in-pane-8', @openEntry, 'tree-view'
    registerCommand 'open-selected-entry-in-pane-9', @openEntry, 'tree-view'
    @subs.add 'atom-workspace', 'mouseup', '.tree-view-resizer .entry', (e) => process.nextTick => @openEntry e

    @enable()

  enable: =>
    return null unless @getTreeViewResizerEl()
    @enabled = true
    treeViewResizerEl.classList.add 'autohide'
    @hide(true)
    @update()

  disable: =>
    return unless @getTreeViewEl()
    @enabled = false
    treeViewResizerEl.classList.remove 'autohide', 'autohide-hover'
    treeViewResizerEl.style.width = "#{treeViewEl.clientWidth}px"
    treeViewResizerEl.parentNode?.style?.width = ''
    {treeViewModel, treeViewResizerEl, treeViewEl} = {}

  update: (@conf = atom.config.get 'autohide-tree-view') =>
    return unless @getTreeViewResizerEl()
    if @conf.pushEditor
      treeViewResizerEl.classList.add 'push-editor'
      treeViewResizerEl.parentNode?.style?.width = ''
    else
      treeViewResizerEl.classList.remove 'push-editor'
      treeViewResizerEl.parentNode?.style?.width = "#{@conf.hiddenWidth}px"

  show: (noDelay = false) =>
    return unless @getTreeViewEl()
    setTimeout =>
      @animate treeViewEl.clientWidth, =>
        @visible = true
    , Number(!noDelay) * @conf.showDelay

  hide: (noDelay = false) =>
    return unless @getTreeViewResizerEl()
    setTimeout =>
      @animate @conf.hiddenWidth, =>
        @visible = false
    , Number(!noDelay) * @conf.hideDelay
    @enableHoverEvents()

  toggle: =>
    console.log @visible
    if @visible
      @hide()
    else
      @show()

  openEntry: (e) =>
    return unless @getTreeViewModel()
    if treeViewModel.selectedEntry().classList.contains 'directory'
      @show true
    else if e.type isnt 'mouseup'
      @hide true

  getTreeViewModel: ->
    treeViewModel ?= do ->
      return null unless atom.packages.isPackageActive 'tree-view'
      pkg = atom.packages.getActivePackage 'tree-view'
      pkg.mainModule.createView()

  getTreeViewResizerEl: ->
    treeViewResizerEl ?= do =>
      @getTreeViewModel()
      return null unless treeViewModel
      atom.views.getView treeViewModel

  getTreeViewEl: ->
    treeViewEl ?= do =>
      @getTreeViewResizerEl()
      return null unless treeViewResizerEl
      treeViewResizerEl.querySelector '.tree-view'

  animate: do ->
    {rafHandle, initialWidth, widthDiff} = {}

    nextFrame = (start, duration, cb) ->
      =>
        rafHandle = requestAnimationFrame nextFrame.call(@, start, duration, cb)
        progress = (Date.now() - start) / duration
        if 1 <= Math.abs progress
          progress = progress / Math.abs progress
          cancelAnimationFrame rafHandle
          rafHandle = null
          cb?()
        @getTreeViewResizerEl().style.width = "#{initialWidth + widthDiff * progress}px"

    (targetWidth, cb) ->
      return unless @getTreeViewResizerEl()
      if rafHandle?
        cancelAnimationFrame rafHandle
      initialWidth = @getTreeViewResizerEl().clientWidth
      widthDiff = targetWidth - initialWidth
      start = Date.now()
      duration = Math.abs widthDiff / (@conf.animationSpeed or Infinity)
      rafHandle = requestAnimationFrame nextFrame.call(@, start, duration, cb)

  enableHoverEvents: =>
    @getTreeViewResizerEl()?.classList.add 'autohide-hover'

  disableHoverEvents: =>
    @getTreeViewResizerEl()?.classList.remove 'autohide-hover'

module.exports = new AutohideTreeView()