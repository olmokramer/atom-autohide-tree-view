'use strict'
{CompositeDisposable} = require 'atom'

class AutohideTreeView
  hideDuration = null # cache hideDuration value
  stylesheet = null # this holds the configurable css rules

  getStylesheet = ->
    return stylesheet if stylesheet?
    stylesheet = document.createElement 'style'
    stylesheet.type = 'text/css'
    document.querySelector('head atom-styles').appendChild stylesheet
    stylesheet

  updateStylesheet = (selector, property, value) ->
    sheet = getStylesheet().sheet
    sheet.insertRule "#{selector} { #{property}: #{value}; }", sheet.cssRules.length

  calculateHideDuration = (hideDelay) ->
    hideDelay ?= atom.config.get 'autohide-tree-view.hideDelay'
    openDelay = atom.config.get 'autohide-tree-view.openDelay'
    hideDuration = if hideDelay is 0 then 0 else .05 + hideDelay - openDelay

  config:
    unfoldSpeed:
      description: 'The speed of the unfold animation in 1000 pixels per second (1-50)'
      type: 'number'
      default: 1
      minimum: 1
      maximum: 50
    hideDelay:
      description: 'Rough estimation of the delay - in seconds - before the menu starts hiding, 0 turns of the animation entirely (0-INFINITY)'
      type: 'number'
      default: .3
      minimum: 0
    openDelay:
      description: 'The delay before the tree-view is unfolded in seconds'
      type: 'number'
      default: .2
      minimum: 0
    minimizedWidth:
      description: 'The width - in pixels - of the tree-view when minimized/hidden (1-INFINITY)'
      type: 'integer'
      default: 1
      minimum: 1

  activate: ->
    @subs = new CompositeDisposable()
    @subs.add atom.config.observe 'autohide-tree-view.unfoldSpeed', @applyUnfoldSpeed.bind @
    @subs.add atom.config.observe 'autohide-tree-view.hideDelay', @applyHideDelay.bind @
    @subs.add atom.config.observe 'autohide-tree-view.openDelay', @applyOpenDelay.bind @
    @subs.add atom.config.observe 'autohide-tree-view.minimizedWidth', @applyMinWidth.bind @
    @subs.add atom.config.observe 'tree-view.showOnRightSide', @applyTreeViewSide.bind @

  deactivate: ->
    @unfoldSpeedSub.dispose()
    @hideDelaySub.dispose()
    @minWidthSub.dispose()
    if stylesheet?
      stylesheet.parentNode.removeChild stylesheet
      stylesheet = null

  applyUnfoldSpeed: (speed) ->
    maxWidth = Math.max 2500, 1000 * speed * calculateHideDuration()
    updateStylesheet '.tree-view-resizer:hover', 'max-width', "#{maxWidth}px!important"

  applyHideDelay: (delay) ->
    duration = calculateHideDuration(delay)
    updateStylesheet '.tree-view-resizer', 'transition-duration', "#{duration}s"

  applyOpenDelay: (delay) ->
    updateStylesheet '.tree-view-resizer', 'transition-delay', "#{delay}s"
    @applyHideDelay()

  applyMinWidth: (width) ->
    updateStylesheet '.tree-view-resizer', 'min-width', "#{width}px!important"
    updateStylesheet '.tree-view-resizer', 'max-width', "#{width}px!important"
    treeViewRight = atom.config.get 'tree-view.showOnRightSide'
    updateStylesheet "atom-panel.#{if treeViewRight then 'right' else 'left'}", 'min-width', "#{width}px"
    updateStylesheet "atom-panel.#{if treeViewRight then 'left' else 'right'}", 'min-width', 'auto'

  applyTreeViewSide: -> @applyMinWidth atom.config.get 'autohide-tree-view.minimizedWidth'

module.exports = new AutohideTreeView()