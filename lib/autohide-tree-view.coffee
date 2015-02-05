'use strict'
SubAtom = require 'sub-atom'

class AutohideTreeView
  treeView = null # the tree view element

  config:
    showDelay:
      description: 'The delay before the tree-view is unfolded in seconds'
      type: 'number'
      default: .2
      minimum: 0
    hideDelay:
      description: 'Rough estimation of the delay - in seconds - before the menu starts hiding'
      type: 'number'
      default: .2
      minimum: 0
    minimizedWidth:
      description: 'The width - in pixels - of the tree-view when minimized/hidden'
      type: 'integer'
      default: 1
      minimum: 1

  activate: ->
    @subs = new SubAtom()
    @subs.add atom.packages.onDidActivatePackage (pkg) =>
      if pkg.path.match(/\/tree-view\/?$/i)
        treeView = pkg.mainModule.createView()
        treeViewEl = atom.views.getView treeView
        treeViewEl.classList.add 'autohide'
        @applyMinimizedWidth()
        @subs.add treeViewEl, 'click', => @show true
        @subs.add treeViewEl,
          'tree-view:expand-directory': => @show true
          'tree-view:recursive-expand-directory': => @show true
          'tree-view:collapse-directory': => @show true
          'tree-view:recursive-collapse-directory': => @show true

    @subs.add atom.packages.onDidDeactivatePackage (pkg) ->
      if pkg.path.match /\/tree-view\/?/i
        treeView = null

    @subs.add atom.config.observe 'autohide-tree-view.minimizedWidth', (width) =>
      @applyMinimizedWidth width

    @subs.add atom.config.observe 'tree-view.showOnRightSide', =>
      @applyMinimizedWidth()

    @subs.add 'atom-workspace', 'mouseenter', '.tree-view-resizer.autohide', =>
      @show()

    @subs.add 'atom-workspace', 'mouseleave', '.tree-view-resizer.autohide', =>
      @hide()

    @subs.add atom.commands.add 'atom-workspace', 'tree-view:toggle', =>
      @applyMinimizedWidth()

    @subs.add atom.commands.add 'atom-workspace', 'tree-view:show', =>
      @applyMinimizedWidth()

  deactivate: ->
    @subs.dispose()

  show: (noDelay) ->
    return unless treeView?.isVisible()
    treeViewEl = atom.views.getView treeView
    width = treeViewEl.querySelector('.tree-view').clientWidth
    if width > treeViewEl.clientWidth then noDelay = true
    transitionDelay = if noDelay then 0 else atom.config.get 'autohide-tree-view.showDelay'
    treeViewEl.style.transitionDelay = "#{transitionDelay}s"
    treeViewEl.style.width = "#{width}px"
    treeView.focus()

  hide: (noDelay) ->
    return unless treeView?.isVisible()
    treeViewEl = atom.views.getView treeView
    width = atom.config.get 'autohide-tree-view.minimizedWidth'
    transitionDelay = atom.config.get 'autohide-tree-view.hideDelay'
    treeViewEl.style.transitionDelay = "#{transitionDelay}s"
    treeViewEl.style.width = "#{width}px"
    treeView.unfocus()

  applyMinimizedWidth: (width) ->
    return unless treeView?.isVisible()
    width ?= atom.config.get 'autohide-tree-view.minimizedWidth'
    width = "#{width}px"
    treeViewEl = atom.views.getView treeView
    treeViewEl.style.setProperty 'width', width
    treeViewEl.parentNode.style.setProperty 'width', width, 'important'

module.exports = new AutohideTreeView()