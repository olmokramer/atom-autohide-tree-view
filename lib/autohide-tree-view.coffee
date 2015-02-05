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
        global.treeViewbarf = atom.views.getView treeView
        atom.views.getView(treeView).classList.add 'autohide'
        @applyMinimizedWidth()

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

    @subs.add atom.commands.add 'atom-workspace', 'tree-view:expand-directory', =>
      @unfold()

  deactivate: ->
    @subs.dispose()

  unfold: (noDelay) ->
    return unless treeView?.isVisible()
    treeViewEl = atom.views.getView treeView
    maxWidth = treeViewEl.querySelector('.tree-view').clientWidth
    setTimeout ->
      treeViewEl.style.maxWidth = "#{maxWidth}px"
    , if noDelay then 0 else 1000 * atom.config.get 'autohide-tree-view.showDelay'

  fold: ->
    return unless treeView?.isVisible()
    treeViewEl = atom.views.getView treeView
    maxWidth = atom.config.get 'autohide-tree-view.minimizedWidth'
    setTimeout ->
      treeViewEl.style.maxWidth = "#{maxWidth}px"
    , 1000 * atom.config.get 'autohide-tree-view.hideDelay'

  applyMinimizedWidth: (width) ->
    return unless treeView?.isVisible()
    width ?= atom.config.get 'autohide-tree-view.minimizedWidth'
    width = "#{width}px"
    treeViewEl = atom.views.getView treeView
    treeViewEl.style.setProperty 'max-width', width
    treeViewEl.parentNode.style.setProperty 'min-width', width, 'important'

module.exports = new AutohideTreeView()