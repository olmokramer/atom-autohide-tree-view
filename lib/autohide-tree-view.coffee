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
    hideOnUnfocus:
      description: 'Hide the tree view when it is unfocused (breaks scrollbar dragging when enabled)'
      type: 'boolean'
      default: true
    pushEditor:
      description: 'Push the editor to the right when showing the tree view'
      type: 'boolean'
      default: false

  activate: (state) ->
    @subs = new SubAtom()
    @subs.add atom.packages.onDidActivateInitialPackages =>
      @initialize state
    if @enabled and atom.packages.isPackageActive 'tree-view'
      @initialize state

  deactivate: ->
    @initialized = false
    @disable() if @enabled
    @subs.dispose()

  serialize: ->
    {@enabled}

  initialize: (state) ->
    return if @initialized
    @initialized = true

    @enabled = state.enabled ? true

    if @enabled and atom.packages.isPackageActive 'tree-view'
      @enable()

    @subs.add atom.packages.onDidActivatePackage (pkg) =>
      @enable pkg if @enabled and 'tree-view' is path.basename pkg.path

    @subs.add atom.packages.onDidDeactivatePackage (pkg) =>
      @disable() if @enabled and 'tree-view' is path.basename pkg.path

    @subs.add atom.config.onDidChange 'autohide-tree-view.hiddenWidth', (width) => @applyHiddenWidth width
    @subs.add atom.config.observe 'autohide-tree-view.pushEditor', (pushEditor) => @applyPushEditor pushEditor
    @subs.add atom.config.onDidChange 'tree-view.showOnRightSide', (width) => @applyHiddenWidth width

    @subs.add 'atom-workspace', 'mouseenter', '.tree-view-resizer.autohide-hover-events', => @show()
    @subs.add 'atom-workspace', 'mouseleave', '.tree-view-resizer.autohide-hover-events', => @hide()
    @subs.add 'atom-workspace', 'blur', '.tree-view-resizer.autohide', =>
      if atom.config.get 'autohide-tree-view.hideOnUnfocus' then @hide true

    @subs.add atom.commands.add 'atom-workspace', 'autohide-tree-view:enable', => @enable()
    @subs.add atom.commands.add 'atom-workspace', 'autohide-tree-view:disable', => @disable()
    @subs.add atom.commands.add 'atom-workspace', 'autohide-tree-view:toggle-enabled', => @toggleEnabled()
    @subs.add atom.commands.add 'atom-workspace', 'autohide-tree-view:show', => @show true, true
    @subs.add atom.commands.add 'atom-workspace', 'autohide-tree-view:hide', => @hide true
    @subs.add atom.commands.add 'atom-workspace', 'autohide-tree-view:toggle-visible', => @toggleVisible()

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

  enable: (treeViewPkg) ->
    treeViewPkg ?= atom.packages.getActivePackage 'tree-view'
    return unless treeViewPkg?
    @enabled = true
    treeView = treeViewPkg.mainModule.createView()
    treeViewEl = atom.views.getView treeView
    treeViewEl.classList.add 'autohide', 'autohide-hover-events'
    @hide true

  disable: ->
    @enabled = false
    if treeViewEl?
      treeViewEl.classList.remove 'autohide', 'autohide-hover-events', 'autohide-unfolded'
      treeViewEl.style.transitionDelay = ''
      treeViewEl.style.transitionDuration = ''
      treeViewEl.style.position = ''
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
    @applyHiddenWidth()
    @applyDoAnimate()
    width = treeViewEl.querySelector('.tree-view').clientWidth
    if width > treeViewEl.clientWidth > @getSetting 'hiddenWidth'
      noDelay = true
    transitionDelay = !noDelay * @getSetting 'showDelay'
    treeViewEl.classList.add 'autohide-unfolded'
    treeViewEl.style.transitionDelay = "#{transitionDelay}s"
    treeViewEl.style.width = "#{width}px"
    treeView.focus()
    @disableHoverEvents() if disableHoverEvents

  hide: (noDelay) ->
    return unless @enabled
    @applyDoAnimate()
    transitionDelay = !noDelay * @getSetting 'hideDelay'
    treeViewEl.classList.remove 'autohide-unfolded'
    treeViewEl.style.transitionDelay = "#{transitionDelay}s"
    @applyHiddenWidth()
    treeViewEl.blur()
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

  applyDoAnimate: (doAnimate) ->
    return unless @enabled
    doAnimate = doAnimate?.newValue ? @getSetting 'animate'
    treeViewEl.style.transitionDuration = "#{!!doAnimate * .3}s"

  applyHiddenWidth: (width) ->
    return unless @enabled
    width = @getSetting 'hiddenWidth' if isNaN parseInt width
    treeViewEl.style.width = "#{width}px"
    treeViewEl.parentNode.style?.width = "#{width}px" unless @getSetting 'pushEditor'

  applyPushEditor: (pushEditor) ->
    return unless @enabled
    if pushEditor
      treeViewEl.style.position = 'relative'
      treeViewEl.parentNode.style?.width = ''
    else
      treeViewEl.style.position = 'absolute'
      treeViewEl.parentNode.style?.width = "#{@getSetting 'hiddenWidth'}px"

  getSetting: (setting) -> atom.config.get "autohide-tree-view.#{setting}"

  enableHoverEvents: -> treeViewEl.classList.add 'autohide-hover-events'

  disableHoverEvents: -> treeViewEl.classList.remove 'autohide-hover-events'

module.exports = new AutohideTreeView()