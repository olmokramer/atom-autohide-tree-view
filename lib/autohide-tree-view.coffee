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
    @subs.add atom.packages.onDidActivatePackage (pkg) =>
      @initialize state, pkg if pkg.path.match(/\/tree-view\/?$/i)

  deactivate: ->
    @disable() if treeViewEl?
    @subs.dispose()

  serialize: ->
    {@enabled}

  initialize: (state, treeViewPkg) ->
    # get the tree view model and element
    treeView = treeViewPkg.mainModule.createView()
    treeViewEl = atom.views.getView treeView
    # enable if was enabled in previous session
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

    # following events should be fired AFTER tree-view is done handling them
    @subs.add treeViewEl, 'click', '.entry', (event) =>
      # console.log event.target, event.currentTarget
      if event.currentTarget.classList.contains 'directory'
        @show true
      else
        @hide true
    @subs.add treeViewEl,
      'tree-view:expand-directory': => @show true
      'tree-view:recursive-expand-directory': => @show true
      'tree-view:collapse-directory': => @show true
      'tree-view:recursive-collapse-directory': => @show true
      'tree-view:open-selected-entry': => @hide true
    @subs.add atom.config.observe 'tree-view:showOnRightSide', =>
      @applyHiddenWidth()

  toggleEnabled: ->
    if @enabled
      @disable()
    else
      @enable()

  enable: ->
    treeViewEl.classList.add 'autohide'
    @applyHiddenWidth()
    @enableHoverEvents()
    @hide true
    @enabled = true

  disable: ->
    treeViewEl.classList.remove 'autohide'
    treeViewEl.classList.remove 'autohide-hover-events'
    treeViewEl.classList.remove 'unfolded'
    treeViewEl.style.transitionDelay = ''
    treeViewEl.style.width = ''
    treeViewEl.parentNode.style.width = ''
    treeViewEl.style.width = treeViewEl.querySelector('.tree-view').clientWidth
    @enabled = false

  toggleVisible: ->
    if treeViewEl.classList.contains 'unfolded'
      @hide true
    else
      @show true, true

  show: (noDelay, disableHoverEvents) ->
    width = treeViewEl.querySelector('.tree-view').clientWidth
    noDelay = true if width > treeViewEl.clientWidth > atom.config.get 'autohide-tree-view.hiddenWidth'
    transitionDelay = if noDelay then 0 else atom.config.get 'autohide-tree-view.showDelay'
    treeViewEl.classList.add 'unfolded'
    treeViewEl.style.transitionDelay = "#{transitionDelay}s"
    treeViewEl.style.width = "#{width}px"
    treeView.focus()
    @disableHoverEvents() if disableHoverEvents

  hide: (noDelay) ->
    width = atom.config.get 'autohide-tree-view.hiddenWidth'
    transitionDelay = if noDelay then 0 else atom.config.get 'autohide-tree-view.hideDelay'
    treeViewEl.classList.remove 'unfolded'
    treeViewEl.style.transitionDelay = "#{transitionDelay}s"
    treeViewEl.style.width = "#{width}px"
    treeView.unfocus()
    @enableHoverEvents()

  applyHiddenWidth: (width = atom.config.get 'autohide-tree-view.hiddenWidth') ->
    treeViewEl.style.setProperty 'width', "#{width}px"
    treeViewEl.parentNode.style.setProperty 'width', "#{width}px", 'important'

  enableHoverEvents: ->
    treeViewEl.classList.add 'autohide-hover-events'

  disableHoverEvents: ->
    treeViewEl.classList.remove 'autohide-hover-events'

module.exports = new AutohideTreeView()