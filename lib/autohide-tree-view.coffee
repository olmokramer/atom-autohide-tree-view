'use strict'
SubAtom = require 'sub-atom'

clone = (obj) ->
  res = {}
  for own key of obj
    res[key] = obj[key]
  res

class AutohideTreeView
  config: require './config'

  activate: ->
    @disposables = new SubAtom()

    atom.config.unset 'autohide-tree-view.focusTreeViewOnOpen'
    atom.config.unset 'autohide-tree-view.unfocusTreeViewOnClose'

    atom.packages.activatePackage('tree-view').then (treeViewPkg) =>
      @treeView = treeViewPkg.mainModule.createView()
      @treeViewEl = atom.views.getView @treeView
      @treeViewEl.classList.add 'autohide'
      @observe()
      @resize()
    .catch (error) ->
      console.error error, '\n', error.stack

  deactivate: ->
    @disposables.dispose()
    @treeViewEl.classList.remove 'autohide', 'autohide-open', 'autohide-hover'
    @treeViewEl.style.width = "#{@getTreeViewWidth}px"
    @treeViewEl.parentNode?.style?.width = ''
    {@treeView, @treeViewEl} = {}

  observe: ->
    @disposables.add atom.config.observe 'autohide-tree-view', (@conf) => @resize()
    @disposables.add atom.config.observe 'tree-view.showOnRightSide', @resize

    @disposables.add atom.commands.add 'atom-workspace',
      'autohide-tree-view:show': => @toggle true
      'autohide-tree-view:hide': => @toggle false
      'autohide-tree-view:toggle': => @toggle()

    @disposables.add atom.commands.add '.tree-view-resizer.autohide', 'core:cancel', => @hide 0

    @disposables.add 'atom-workspace', 'mouseenter', '.tree-view-resizer.autohide-hover', => @show()
    @disposables.add 'atom-workspace', 'mouseleave', '.tree-view-resizer.autohide-hover', => @hide()

    # respond to tree view commands
    @disposables.add atom.commands.add 'atom-workspace',
      'tree-view:toggle': => process.nextTick @resize
      'tree-view:reveal-active-file': => @toggle true

    for command in ['add-file', 'add-folder', 'duplicate', 'rename', 'move']
      @disposables.add atom.commands.add 'atom-workspace', "tree-view:#{command}", =>
        @focusedElement = null

    resizeCommands = [
      'expand-directory'
      'recursive-expand-directory'
      'collapse-directory'
      'recursive-collapse-directory'
      'toggle-vcs-ignored-files'
      'toggle-ignored-names'
      'remove-project-folder'
    ]

    for direction in ['', '-right', '-left', '-up', '-down']
      resizeCommands.push "open-selected-entry#{direction}"

    for i in [1...10]
      resizeCommands.push "open-selected-entry-in-pane-#{i}"

    for command in resizeCommands
      @disposables.add atom.commands.add 'atom-workspace', "tree-view:#{command}", @openEntry

    @disposables.add 'atom-workspace', 'mouseup', '.tree-view-resizer .entry', (e) =>
      process.nextTick => @openEntry e

  resize: =>
    {pushEditor} = @conf
    @conf.pushEditor = true
    @show 0
    @hide 0
    @conf.pushEditor = pushEditor

  show: (delay = @conf.showDelay) ->
    @visible = true
    @focusedElement = document.activeElement
    @treeViewEl.querySelector('.tree-view-scroller').style.display = ''
    @animate @getTreeViewWidth(), delay, =>
      @treeViewEl.classList.add 'autohide-open'
      @treeView.focus()

  hide: (delay = @conf.hideDelay) ->
    @visible = false
    @enableHoverEvents()
    @treeViewEl.classList.remove 'autohide-open'
    @animate @conf.hiddenWidth, delay, =>
      @treeViewEl.querySelector('.tree-view-scroller').style.display = 'none'
      @recoverFocus()

  toggle: (visible = !@visible) ->
    @disableHoverEvents()
    if visible then @show 0 else @hide 0

  recoverFocus: ->
    if @focusedElement?.focused?
      @focusedElement.focused()
    else if @focusedElement?.focus?
      @focusedElement.focus()

  openEntry: (e) =>
    if @treeView.selectedEntry().classList.contains 'directory'
      @show 0
    else if e?.type isnt 'mouseup'
      @hide 0

  enableHoverEvents: ->
    @treeViewEl.classList.add 'autohide-hover'

  disableHoverEvents: ->
    @treeViewEl.classList.remove 'autohide-hover'

  getTreeViewWidth: ->
    @treeViewEl.querySelector('.tree-view').clientWidth

  animate: (targetWidth, delay, cb = ->) ->
    initialWidth = @treeViewEl.clientWidth
    duration = Math.abs(targetWidth - initialWidth) / (@conf.animationSpeed or Infinity)

    if @currentAnimation?
      animation.cancel() for animation in @currentAnimation
      delay = 0

    animationOpts = [[
      {width: initialWidth}
      {width: targetWidth}
    ], {duration, delay}]

    elements = [@treeViewEl]
    elements.push @treeViewEl.parentNode if @conf.pushEditor

    animationsFinished = 0
    @currentAnimation = elements.map (element) =>
      element.style.width = "#{initialWidth}px"

      animation = element.animate.apply element, animationOpts

      animation.onfinish = =>
        element.style.width = "#{targetWidth}px"

        if ++animationsFinished is elements.length
          @currentAnimation = null
          cb() if animation.playState is 'finished'

      animation

module.exports = new AutohideTreeView()
