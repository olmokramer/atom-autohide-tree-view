'use strict'
path = require 'path'
SubAtom = require 'sub-atom'

class AutohideTreeView
  treeView = null
  treeViewEl = null

  config:
    animate:
      description: 'Enable/disable the animation'
      type: 'boolean'
      default: true
    showDelay:
      description: 'The delay  - in seconds - before the tree-view will show'
      type: 'number'
      default: .2
      minimum: 0
    hideDelay:
      description: 'The delay - in seconds - before the tree-view will hide'
      type: 'number'
      default: .2
      minimum: 0
    hiddenWidth:
      description: 'The width - in pixels - of the tree-view when minimized/hidden'
      type: 'integer'
      default: 5
      minimum: 1

  activate: (state) ->
    # console.log 'autohide-tree-view: activating'
    @enabled = state.enabled ? true
    @subs = new SubAtom()
    @subs.add atom.packages.onDidActivateInitialPackages =>
      # console.log 'autohide-tree-view: initialize after activate initial packages' unless @initialized
      @initialize()
    if @enabled and atom.packages.isPackageActive 'tree-view'
      # console.log 'autohide-tree-view: initialize before activate initial packages' unless @initialized
      @initialize()
    # console.log 'autohide-tree-view: done activating'

  deactivate: ->
    @initialized = false
    @disable() if @enabled
    @subs.dispose()

  serialize: ->
    {@enabled}

  initialize: ->
    return if @initialized

    if @enabled and atom.packages.isPackageActive 'tree-view'
      @enable()

    @subs.add atom.packages.onDidActivatePackage (pkg) =>
      @enable pkg if @enabled and 'tree-view' is path.basename pkg.path

    @subs.add atom.packages.onDidDeactivatePackage (pkg) =>
      @disable() if @enabled and 'tree-view' is path.basename pkg.path

    @subs.add atom.config.onDidChange 'autohide-tree-view.hiddenWidth', (width) => @applyHiddenWidth width
    @subs.add atom.config.onDidChange 'autohide-tree-view.animate', (doAnimate) => @applyAnimate doAnimate
    @subs.add atom.config.onDidChange 'tree-view.showOnRightSide', (width) => @applyHiddenWidth width

    @subs.add 'atom-workspace', 'mouseenter', '.tree-view-resizer.autohide-hover-events', => @show()
    @subs.add 'atom-workspace', 'mouseleave', '.tree-view-resizer.autohide-hover-events', => @hide()
    @subs.add 'atom-workspace', 'blur', '.tree-view-resizer.autohide', => @hide true

    @subs.add atom.commands.add 'atom-workspace',
      'autohide-tree-view:enable': => @enable()
      'autohide-tree-view:disable': => @disable()
      'autohide-tree-view:toggle-enabled': => @toggleEnabled()
      'autohide-tree-view:show': => @show true, true
      'autohide-tree-view:hide': => @hide true
      'autohide-tree-view:toggle-visible': => @toggleVisible()

    @subs.add 'atom-workspace', 'tree-view:expand-directory', '.tree-view-resizer', @openEntry
    @subs.add 'atom-workspace', 'tree-view:recursive-expand-directory', '.tree-view-resizer', @openEntry
    @subs.add 'atom-workspace', 'tree-view:collapse-directory', '.tree-view-resizer', @openEntry
    @subs.add 'atom-workspace', 'tree-view:recursive-collapse-directory', '.tree-view-resizer', @openEntry
    @subs.add 'atom-workspace', 'tree-view:open-selected-entry', '.tree-view-resizer', @openEntry
    @subs.add 'atom-workspace', 'tree-view:open-selected-entry-right', '.tree-view-resizer', @openEntry
    @subs.add 'atom-workspace', 'tree-view:open-selected-entry-left', '.tree-view-resizer', @openEntry
    @subs.add 'atom-workspace', 'tree-view:open-selected-entry-up', '.tree-view-resizer', @openEntry
    @subs.add 'atom-workspace', 'tree-view:open-selected-entry-down', '.tree-view-resizer', @openEntry
    @subs.add 'atom-workspace', 'tree-view:open-selected-entry-in-pane-1', '.tree-view-resizer', @openEntry
    @subs.add 'atom-workspace', 'tree-view:open-selected-entry-in-pane-2', '.tree-view-resizer', @openEntry
    @subs.add 'atom-workspace', 'tree-view:open-selected-entry-in-pane-3', '.tree-view-resizer', @openEntry
    @subs.add 'atom-workspace', 'tree-view:open-selected-entry-in-pane-4', '.tree-view-resizer', @openEntry
    @subs.add 'atom-workspace', 'tree-view:open-selected-entry-in-pane-5', '.tree-view-resizer', @openEntry
    @subs.add 'atom-workspace', 'tree-view:open-selected-entry-in-pane-6', '.tree-view-resizer', @openEntry
    @subs.add 'atom-workspace', 'tree-view:open-selected-entry-in-pane-7', '.tree-view-resizer', @openEntry
    @subs.add 'atom-workspace', 'tree-view:open-selected-entry-in-pane-8', '.tree-view-resizer', @openEntry
    @subs.add 'atom-workspace', 'tree-view:open-selected-entry-in-pane-9', '.tree-view-resizer', @openEntry
    @subs.add 'atom-workspace', 'mouseup', '.tree-view-resizer .entry', (event) =>
      setTimeout =>
        @openEntry event
      , 0

    @initialized = true

  enable: (treeViewPkg) ->
    try
      console.log 'autohide-tree-view: enable'
      console.log 'autohide-tree-view: tree-view package active: ', atom.packages.isPackageActive 'tree-view'
      treeViewPkg ?= atom.packages.getActivePackage 'tree-view'
      console.log 'autohide-tree-view: tree-view package found: ', treeViewPkg?
      return unless treeViewPkg?
      @enabled = true
      treeView = treeViewPkg.mainModule.createView()
      console.log 'autohide-tree-view: tree-view model: ', treeView
      treeViewEl = atom.views.getView treeView
      console.log 'autohide-tree-view: tree-view element: ', treeViewEl
      treeViewEl.classList.add 'autohide', 'autohide-hover-events'
      @applyHiddenWidth()
      console.log 'autohide-tree-view: applied setting hiddenWidth'
      @applyAnimate()
      console.log 'autohide-tree-view: applied setting animate'
      @hide true
      console.log ''
      console.log 'autohide-tree-view: enabled'
    catch e
      console.error e

  disable: ->
    @enabled = false
    if treeViewEl?
      treeViewEl.classList.remove 'autohide', 'autohide-hover-events', 'autohide-unfolded'
      treeViewEl.style.transitionDelay = ''
      treeViewEl.style.transitionDuration = ''
      treeViewEl.style.width = "#{treeViewEl.querySelector('.tree-view').clientWidth}px"
      treeViewEl.parentNode.style.width = ''
    treeView = treeViewEl = null

  toggleEnabled: ->
    if @enabled
      @disable()
    else
      @enable()

  show: (noDelay, disableHoverEvents) ->
    return unless @enabled
    width = treeViewEl.querySelector('.tree-view').clientWidth
    if width > treeViewEl.clientWidth > @getHiddenWidth()
      noDelay = true
    transitionDelay = !noDelay * @getShowDelay()
    treeViewEl.classList.add 'autohide-unfolded'
    treeViewEl.style.transitionDelay = "#{transitionDelay}s"
    treeViewEl.style.width = "#{width}px"
    treeView.focus()
    @disableHoverEvents() if disableHoverEvents

  hide: (noDelay) ->
    return unless @enabled
    width = @getHiddenWidth()
    transitionDelay = !noDelay * @getHideDelay()
    treeViewEl.classList.remove 'autohide-unfolded'
    treeViewEl.style.transitionDelay = "#{transitionDelay}s"
    treeViewEl.style.width = "#{width}px"
    treeView.unfocus()
    @enableHoverEvents()

  toggleVisible: ->
    return unless @enabled
    if treeViewEl.classList.contains 'autohide-unfolded'
      @hide true
    else
      @show true, true

  openEntry: (event) =>
    return unless @enabled
    if treeView.selectedEntry().classList.contains 'directory'
      @show true
    else if event.type isnt 'mouseup'
      @hide true

  applyAnimate: (doAnimate) ->
    return unless @enabled
    doAnimate = doAnimate?.newValue ? @getAnimate()
    treeViewEl.style.transitionDuration = "#{!!doAnimate * .3}s"

  applyHiddenWidth: (width) ->
    return unless @enabled
    width = @getHiddenWidth() if isNaN parseInt width
    treeViewEl.style.width = "#{width}px"
    treeViewEl.parentNode.style.width = "#{width}px"

  getAnimate: -> atom.config.get 'autohide-tree-view.animate'

  getShowDelay: -> atom.config.get 'autohide-tree-view.showDelay'

  getHideDelay: -> atom.config.get 'autohide-tree-view.hideDelay'

  getHiddenWidth: -> atom.config.get 'autohide-tree-view.hiddenWidth'

  enableHoverEvents: ->
    treeViewEl.classList.add 'autohide-hover-events'

  disableHoverEvents: ->
    treeViewEl.classList.remove 'autohide-hover-events'

module.exports = new AutohideTreeView()