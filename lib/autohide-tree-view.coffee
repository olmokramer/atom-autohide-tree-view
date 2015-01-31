'use strict'
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

  calculateHideDuration = (delay) ->
    delay ?= atom.config.get 'autohide-tree-view.hideDelay'
    hideDuration = if delay is 0 then 0 else .05 + delay

  config:
    unfoldSpeed:
      description: 'The speed of the unfold animation in 1000 pixels per second (1-50)'
      type: 'number'
      default: 1
      minimum: 1
      maximum: 50
    hideDelay:
      description: 'Rough estimation of the delay before the menu starts hiding in seconds, 0 turns of the animation entirely (0-INFINITY)'
      type: 'number'
      default: .3
      minimum: 0
    minimizedWidth:
      description: 'The width of the tree-view when minimized/hidden in pixels (1-INFINITY)'
      type: 'integer'
      default: 5
      minimum: 1

  activate: ->
    @unfoldSpeedSub = atom.config.observe 'autohide-tree-view.unfoldSpeed', @applyUnfoldSpeed
    @hideDelaySub = atom.config.observe 'autohide-tree-view.hideDelay', @applyHideDelay
    @minWidthSub = atom.config.observe 'autohide-tree-view.minimizedWidth', @applyMinWidth
    @treeViewShowOnRightSideSub = atom.config.observe 'tree-view.showOnRightSide', @applyTreeViewSide

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
    duration = calculateHideDuration()
    updateStylesheet '.tree-view-resizer', 'transition-duration', "#{duration}s"

  applyMinWidth: (width) ->
    updateStylesheet '.tree-view-resizer', 'min-width', "#{width}px!important"
    updateStylesheet '.tree-view-resizer', 'max-width', "#{width}px!important"
    treeViewRight = atom.config.get 'tree-view.showOnRightSide'
    updateStylesheet "atom-panel.#{if treeViewRight then 'right' else 'left'}", 'min-width', "#{width}px"
    updateStylesheet "atom-panel.#{if treeViewRight then 'left' else 'right'}", 'min-width', 'auto'

  applyTreeViewSide: -> @applyMinWidth atom.config.get 'autohide-tree-view.minimizedWidth'

module.exports = new AutohideTreeView()