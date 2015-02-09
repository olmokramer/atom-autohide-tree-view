'use strict'
SubAtom = require 'sub-atom'

class AutohideTreeView
  treeView = null # the tree view model
  treeViewEl = null # the tree view element

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
    # set enabled to true if the it doesn't exist
    state.enabled ?= true
    {@enabled} = state
    # enable if was enabled in previous session
    @enable() if @enabled

    # respond to changes in the config
    @subs.add atom.config.observe 'autohide-tree-view.hiddenWidth', (width) =>
      @applyHiddenWidth width
    @subs.add atom.config.observe 'autohide-tree-view.animate', (doAnimate) =>
      @applyAnimation doAnimate
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

    # disable when the tree-view package gets deactivated
    @subs.add atom.packages.onDidDeactivatePackage (pkg) ->
      treeView = treeViewEl = null if pkg.path.match /\/tree-view\/?/i

    # respond to opening a file/directory
    @subs.add treeViewEl, 'click', '.entry', (event) =>
      @openEntry event

    # listen to commands of the tree view
    @subs.add treeViewEl,
      # adjust tree view size when expanding a directory
      'tree-view:expand-directory': => @show true
      'tree-view:recursive-expand-directory': => @show true
      'tree-view:collapse-directory': => @show true
      'tree-view:recursive-collapse-directory': => @show true
      # respond to opening a file/directory
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
    # disable if enabled and vice-versa
    if @enabled
      @disable()
    else
      @enable()

  # enable autohide behavior
  enable: ->
    @enabled = true
    # add class for css
    treeViewEl.classList.add 'autohide'
    # minimize the tree-view
    @applyHiddenWidth()
    @hide true
    # enable hover events
    @enableHoverEvents()

  # disable autohide behavior
  disable: ->
    @enabled = false
    # remove all possible classes added to the tree view by this package
    treeViewEl.classList.remove 'autohide', 'autohide-hover-events', 'unfolded'
    # reset the inline css rules
    treeViewEl.style.transitionDelay = ''
    treeViewEl.style.width = treeViewEl.querySelector('.tree-view').clientWidth
    treeViewEl.parentNode.style.width = ''

  # show the tree view when it is hidden, hide it otherwise
  toggleVisible: ->
    return unless @enabled
    if treeViewEl.classList.contains 'unfolded'
      @hide true
    else
      @show true, true

  # show the tree view
  show: (noDelay, disableHoverEvents) ->
    return unless @enabled
    # set the width to fit all the items of the tree view
    width = treeViewEl.querySelector('.tree-view').clientWidth
    # immediately open again when the menu is still animating
    if width > treeViewEl.clientWidth > atom.config.get 'autohide-tree-view.hiddenWidth'
      noDelay = true
    # set the transition delay to the config.showDelay
    if noDelay
      transitionDelay = 0
    else
      transitionDelay = atom.config.get 'autohide-tree-view.showDelay'
    # add the unfolded class to animate the contents to opacity = 1
    treeViewEl.classList.add 'unfolded'
    # apply css properties
    treeViewEl.style.transitionDelay = "#{transitionDelay}s"
    treeViewEl.style.width = "#{width}px"
    # focus the tree view to allow keyboard navigation
    treeView.focus()
    # disable hover events if asked
    @disableHoverEvents() if disableHoverEvents

  # hide the tree view
  hide: (noDelay) ->
    return unless @enabled
    # set the width to the config.hiddenWidth
    width = atom.config.get 'autohide-tree-view.hiddenWidth'
    # set the transition delay to config.hideDelay
    if noDelay
      transitionDelay = 0
    else
      transitionDelay = atom.config.get 'autohide-tree-view.hideDelay'
    # remove the unfolded class again
    treeViewEl.classList.remove 'unfolded'
    # apply css properties
    treeViewEl.style.transitionDelay = "#{transitionDelay}s"
    treeViewEl.style.width = "#{width}px"
    # unfocus the tree view
    treeView.unfocus()
    # enable hover events
    @enableHoverEvents()

  openEntry: (event) ->
    # hide when opening a file
    # show when expanding a directory, to adjust the width
    return unless @enabled
    if treeView.selectedEntry().classList.contains 'directory'
      @show true
    else if event.type isnt 'click'
      @hide true

  # apply the hiddenWidth setting
  applyHiddenWidth: (width = atom.config.get 'autohide-tree-view.hiddenWidth') ->
    return unless @enabled
    # set the width of the tree view
    treeViewEl.style.width = "#{width}px"
    # set the width of the tree view panel to adjust for
    # the position: absolute on the tree view
    treeViewEl.parentNode.style.width = "#{width}px"

  # enable/disable the show/hide animation
  applyAnimation: (doAnimate) ->
    return unless @enabled
    treeViewEl.style.transitionDuration = if doAnimate then '.3s' else '0s'

  # enable/disable the hover events on the tree view
  enableHoverEvents: ->
    treeViewEl.classList.add 'autohide-hover-events'

  disableHoverEvents: ->
    treeViewEl.classList.remove 'autohide-hover-events'

module.exports = new AutohideTreeView()