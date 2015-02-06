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
    minimizedWidth:
      description: 'The width - in pixels - of the tree-view when minimized/hidden'
      type: 'integer'
      default: 1
      minimum: 1

  activate: (state) ->
    {@enabled} = state
    @subs = new SubAtom()
    @subs.add atom.packages.onDidActivatePackage (pkg) =>
      @initialize pkg if pkg.path.match(/\/tree-view\/?$/i)

  deactivate: ->
    @disable() if treeViewEl?
    @subs.dispose()

  serialize: ->
    {@enabled}

  initialize: (treeViewPkg) ->
    treeView = treeViewPkg.mainModule.createView()
    treeViewEl = atom.views.getView treeView
    @enable()
    # these events should be fired AFTER tree-view is done
    # handling them
    @subs.add treeViewEl, 'click', => @show true
    @subs.add treeViewEl,
      'tree-view:expand-directory': => @show true
      'tree-view:recursive-expand-directory': => @show true
      'tree-view:collapse-directory': => @show true
      'tree-view:recursive-collapse-directory': => @show true

    @subs.add atom.config.observe 'autohide-tree-view.minimizedWidth', (width) =>
      @applyMinimizedWidth width

    @subs.add 'atom-workspace', 'mouseenter', '.tree-view-resizer.autohide', =>
      @show()

    @subs.add 'atom-workspace', 'mouseleave', '.tree-view-resizer.autohide', =>
      @hide()

    @subs.add atom.commands.add 'atom-workspace',
      'autohide-tree-view:toggle': => @toggle()
      'autohide-tree-view:enable': => @enable()
      'autohide-tree-view:disable': => @disable()

    @subs.add atom.packages.onDidDeactivatePackage (pkg) ->
      treeView = treeViewEl = null if pkg.path.match /\/tree-view\/?/i

  toggle: ->
    return unless treeViewEl?
    if treeViewEl.classList.contains 'autohide'
      @disable()
    else
      @enable()

  enable: ->
    return unless treeViewEl?
    treeViewEl.classList.add 'autohide'
    @applyMinimizedWidth()
    @hide true
    @enabled = true

  disable: ->
    return unless treeViewEl?
    treeViewEl.classList.remove 'autohide'
    treeViewEl.style.transitionDelay = ''
    treeViewEl.style.width = ''
    treeViewEl.parentNode.style.width = ''
    treeViewEl.style.width = treeViewEl.querySelector('.tree-view').clientWidth
    @enabled = false

  show: (noDelay) ->
    return unless treeViewEl?
    width = treeViewEl.querySelector('.tree-view').clientWidth
    if width > treeViewEl.clientWidth > atom.config.get 'autohide-tree-view.minimizedWidth' then noDelay = true
    transitionDelay = if noDelay then 0 else atom.config.get 'autohide-tree-view.showDelay'
    treeViewEl.style.transitionDelay = "#{transitionDelay}s"
    treeViewEl.style.width = "#{width}px"
    treeView.focus()

  hide: (noDelay) ->
    return unless treeViewEl?
    width = atom.config.get 'autohide-tree-view.minimizedWidth'
    transitionDelay = if noDelay then 0 else atom.config.get 'autohide-tree-view.hideDelay'
    treeViewEl.style.transitionDelay = "#{transitionDelay}s"
    treeViewEl.style.width = "#{width}px"
    treeView.unfocus()

  applyMinimizedWidth: (width) ->
    return unless treeViewEl?
    width ?= atom.config.get 'autohide-tree-view.minimizedWidth'
    width = "#{width}px"
    treeViewEl.style.setProperty 'width', width
    treeViewEl.parentNode.style.setProperty 'width', width, 'important'

module.exports = new AutohideTreeView()