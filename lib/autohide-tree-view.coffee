'use strict'
SubAtom = require 'sub-atom'

class AutohideTreeView
  treeView = null # the tree view model
  treeViewEl = null # the tree view element

  config:
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
      default: 1
      minimum: 1

  activate: (state) ->
    @subs = new SubAtom()
    # initialize this package when the tree-view package is activated
    @subs.add atom.packages.onDidActivatePackage (pkg) =>
      @initialize state, pkg if pkg.path.match /\/tree-view\/?$/i

  deactivate: ->
    # cleanup the tree view element
    @disable() if treeViewEl?
    # dispose subscriptions
    @subs.dispose()

  serialize: ->
    # remember if enabled
    {@enabled}

  initialize: (state, treeViewPkg) ->
    # get the tree view model and element
    treeView = treeViewPkg.mainModule.createView()
    treeViewEl = atom.views.getView treeView
    # enable if was enabled in previous session
    state.enabled ?= true
    {@enabled} = state
    @enable() if @enabled

    # respond to changes in the config
    @subs.add atom.config.observe 'autohide-tree-view.hiddenWidth', (width) =>
      @applyHiddenWidth width
    @subs.add atom.config.observe 'tree-view.showOnRightSide', =>
      @applyHiddenWidth()

    # hover events on the tree view
    @subs.add 'atom-workspace', 'mouseenter', '.tree-view-resizer.autohide.autohide-hover-events', =>
      @show()
    @subs.add 'atom-workspace', 'mouseleave', '.tree-view-resizer.autohide.autohide-hover-events', =>
      @hide()

    # register commands for this package
    @subs.add atom.commands.add 'atom-workspace',
      'autohide-tree-view:toggle-enabled': => @toggleEnabled()
      'autohide-tree-view:enable': => @enable()
      'autohide-tree-view:disable': => @disable()
      'autohide-tree-view:toggle-visible': => @toggleVisible()
      'autohide-tree-view:show': => @show true, true
      'autohide-tree-view:hide': => @hide true

    # events on the tree view or tree view package
    @subs.add atom.packages.onDidDeactivatePackage (pkg) ->
      treeView = treeViewEl = null if pkg.path.match /\/tree-view\/?/i

    # hide when opening a file
    # show when expanding a directory
    @subs.add treeViewEl, 'click', '.entry', (event) =>
      @openEntry event

    # listen to commands of the tree view
    @subs.add treeViewEl,
      # adjust tree view size to the width of the actual list
      # when expanding a directory
      'tree-view:expand-directory': => @show true
      'tree-view:recursive-expand-directory': => @show true
      'tree-view:collapse-directory': => @show true
      'tree-view:recursive-collapse-directory': => @show true
      # hideshow on tree view open entry commands
      'tree-view:open-selected-entry': (event) => @openEntry event
      'tree-view:open-selected-entry-right': (event) => @openEntry event
      'tree-view:open-selected-entry-left': (event) => @openEntry event
      'tree-view:open-selected-entry-up': (event) => @openEntry event
      'tree-view:open-selected-entry-down': (event) => @openEntry event
      'tree-view:open-selected-entry-in-pane-1': (event) => @openEntry event
      'tree-view:open-selected-entry-in-pane-2': (event) => @openEntry event
      'tree-view:open-selected-entry-in-pane-3': (event) => @openEntry event
      'tree-view:open-selected-entry-in-pane-4': (event) => @openEntry event
      'tree-view:open-selected-entry-in-pane-5': (event) => @openEntry event
      'tree-view:open-selected-entry-in-pane-6': (event) => @openEntry event
      'tree-view:open-selected-entry-in-pane-7': (event) => @openEntry event
      'tree-view:open-selected-entry-in-pane-8': (event) => @openEntry event
      'tree-view:open-selected-entry-in-pane-9': (event) => @openEntry event

  # enable/disable autohide behavior
  toggleEnabled: ->
    if @enabled
      @disable()
    else
      @enable()

  # enable autohide behavior
  enable: ->
    @enabled = true
    treeViewEl.classList.add 'autohide'
    @applyHiddenWidth()
    @enableHoverEvents()
    @hide true

  # disable autohide behavior
  disable: ->
    @enabled = false
    treeViewEl.classList.remove 'autohide', 'autohide-hover-events', 'unfolded'
    treeViewEl.style.transitionDelay = ''
    treeViewEl.style.width = ''
    treeViewEl.parentNode.style.width = ''
    treeViewEl.style.width = treeViewEl.querySelector('.tree-view').clientWidth

  # show/hide the tree view
  toggleVisible: ->
    return unless @enabled
    if treeViewEl.classList.contains 'unfolded'
      @hide true
    else
      @show true, true

  # show the tree view
  show: (noDelay, disableHoverEvents) ->
    return unless @enabled
    width = treeViewEl.querySelector('.tree-view').clientWidth
    if width > treeViewEl.clientWidth > atom.config.get 'autohide-tree-view.hiddenWidth'
      noDelay = true
    if noDelay
      transitionDelay = 0
    else
      transitionDelay = atom.config.get 'autohide-tree-view.showDelay'
    treeViewEl.classList.add 'unfolded'
    treeViewEl.style.transitionDelay = "#{transitionDelay}s"
    treeViewEl.style.width = "#{width}px"
    treeView.focus()
    @disableHoverEvents() if disableHoverEvents

  # hide the tree view
  hide: (noDelay) ->
    return unless @enabled
    width = atom.config.get 'autohide-tree-view.hiddenWidth'
    if noDelay
      transitionDelay = 0
    else
      transitionDelay = atom.config.get 'autohide-tree-view.hideDelay'
    treeViewEl.classList.remove 'unfolded'
    treeViewEl.style.transitionDelay = "#{transitionDelay}s"
    treeViewEl.style.width = "#{width}px"
    treeView.unfocus()
    @enableHoverEvents()

  openEntry: (event) ->
    return unless @enabled
    if treeView.selectedEntry().classList.contains 'directory'
      @show true
    else if event.type isnt 'click'
      @hide true

  # apply the hiddenWidth setting
  applyHiddenWidth: (width = atom.config.get 'autohide-tree-view.hiddenWidth') ->
    return unless @enabled
    treeViewEl.style.setProperty 'width', "#{width}px"
    treeViewEl.parentNode.style.setProperty 'width', "#{width}px", 'important'

  # enable/disable the hover events on the tree view
  enableHoverEvents: ->
    treeViewEl.classList.add 'autohide-hover-events'

  disableHoverEvents: ->
    treeViewEl.classList.remove 'autohide-hover-events'

module.exports = new AutohideTreeView()