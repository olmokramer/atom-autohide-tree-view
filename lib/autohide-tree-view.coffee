'use strict'
class AutohideTreeView
  stylesheet = null

  getStylesheet = ->
    return stylesheet if stylesheet?
    stylesheet = document.createElement 'style'
    stylesheet.type = 'text/css'
    document.querySelector('head atom-styles').appendChild stylesheet
    stylesheet

  updateStylesheet = (selector, property, value) ->
    sheet = getStylesheet().sheet
    sheet.insertRule "#{selector} { #{property}: #{value}; }", sheet.cssRules.length

  config:
    unfoldSpeed:
      description: 'The speed of the unfold animation in 5000px per second'
      type: 'number'
      default: 2.5
      minimum: 1
      maximum: 10
    hideDelay:
      description: 'Rough estimation of the delay before the menu starts hiding in seconds, 0 turns of the animation entirely'
      type: 'number'
      default: .3
      minimum: 0
      maximum: 1.5
    minimizedWidth:
      description: 'The width of the tree-view when minimized/hidden in pixels'
      type: 'integer'
      default: 5
      minimum: 1
    extraPadding:
      description: 'Adds some padding on the right side of the expanded tree view'
      type: 'integer'
      default: 0
      minimum: 0

  activate: ->
    @unfoldSpeedSub = atom.config.observe 'autohide-tree-view.unfoldSpeed', @applyUnfoldSpeed
    @hideDelaySub = atom.config.observe 'autohide-tree-view.hideDelay', @applyHideDelay
    @minWidthSub = atom.config.observe 'autohide-tree-view.minimizedWidth', @applyMinWidth
    @extraPaddingSub = atom.config.observe 'autohide-tree-view.extraPadding', @applyPadding

  deactivate: ->
    @unfoldSpeedSub.dispose()
    @minWidthSub.dispose()
    @extraPaddingSub.dispose()
    if stylesheet?
      stylesheet.parentNode.removeChild stylesheet
      stylesheet = null

  applyUnfoldSpeed: (speed) ->
    maxWidth = 5000 * speed * (.05 + atom.config.get 'autohide-tree-view.hideDelay')
    updateStylesheet '.tree-view-resizer:hover', 'max-width', "#{maxWidth}px!important"

  applyHideDelay: (delay) ->
    duration = if delay is 0 then 0 else delay + .05
    updateStylesheet '.tree-view-resizer', 'transition-duration', "#{duration}s"

  applyMinWidth: (width) ->
    updateStylesheet '.tree-view-resizer', 'min-width', "#{width}px!important"
    updateStylesheet '.tree-view-resizer', 'max-width', "#{width}px!important"

  applyPadding: (padding) ->
    updateStylesheet '.tree-view-resizer:hover', 'padding-right', "#{padding}px"

module.exports = new AutohideTreeView()