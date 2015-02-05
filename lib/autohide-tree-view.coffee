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
        @subs.add treeViewEl, 'click', => @unfold true
        @subs.add treeViewEl,
          'tree-view:expand-directory': => @unfold true
          'tree-view:recursive-expand-directory': => @unfold true
          'tree-view:collapse-directory': => @unfold true
          'tree-view:recursive-collapse-directory': => @unfold true

    @subs.add atom.packages.onDidDeactivatePackage (pkg) ->
      if pkg.path.match /\/tree-view\/?/i
        treeView = null

    @subs.add atom.config.observe 'autohide-tree-view.minimizedWidth', (width) =>
      @applyMinimizedWidth width

    @subs.add atom.config.observe 'tree-view.showOnRightSide', =>
      @applyMinimizedWidth()

    @subs.add 'atom-workspace', 'mouseenter', '.tree-view-resizer.autohide', =>
      @unfold()

    @subs.add 'atom-workspace', 'mouseleave', '.tree-view-resizer.autohide', =>
      @fold()

    @subs.add atom.commands.add 'atom-workspace', 'tree-view:toggle', =>
      @applyMinimizedWidth()

    @subs.add atom.commands.add 'atom-workspace', 'tree-view:show', =>
      @applyMinimizedWidth()

  deactivate: ->
    @subs.dispose()

  unfold: (noDelay) ->
    return unless treeView?.isVisible()
    treeViewEl = atom.views.getView treeView
    transitionDelay = if noDelay then 0 else atom.config.get 'autohide-tree-view.showDelay'
    width = treeViewEl.querySelector('.tree-view').clientWidth
    treeViewEl.style.transitionDelay = "#{transitionDelay}s"
    treeViewEl.style.width = "#{width}px"
    treeView.focus()

  fold: ->
    return unless treeView?.isVisible()
    treeViewEl = atom.views.getView treeView
    transitionDelay = atom.config.get 'autohide-tree-view.hideDelay'
    width = atom.config.get 'autohide-tree-view.minimizedWidth'
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