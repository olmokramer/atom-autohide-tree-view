'use strict'
class AutohideTreeView
  stylesheet = null

  config:
    unfoldSpeed:
      description: 'The speed of the unfold animation in 10000px per second, 0 turns of the animation. This also affects the delay before folding the tree view.'
      type: 'number'
      default: 2.5
      minimum: 0
      maximum: 10
    minimizedWidth:
      description: 'The width of the tree-view when minimized/hidden in pixels.'
      type: 'integer'
      default: 5
      minimum: 1
    extraPadding:
      description: 'Adds some padding on the right side of the expanded tree view as requested in https://github.com/olmokramer/atom-autohide-tree-view/issues/1'
      type: 'integer'
      default: 0
      minimum: 0

  activate: ->
    @unfoldSpeedSub = atom.config.observe 'autohide-tree-view.unfoldSpeed', (speed) => @applyUnfoldSpeed speed
    @minWidthSub = atom.config.observe 'autohide-tree-view.minimizedWidth', (width) => @applyMinWidth width
    @extraPaddingSub = atom.config.observe 'autohide-tree-view.extraPadding', (padding) => @applyPadding padding

  deactivate: ->
    @unfoldSpeedSub.dispose()
    @minWidthSub.dispose()
    @extraPaddingSub.dispose()

  applyUnfoldSpeed: (speed) ->
    duration = if speed is 0 then 0 else 1 / speed
    @updateStylesheet '.tree-view-resizer', 'transition-duration', "#{duration}s"

  applyMinWidth: (width) ->
    @updateStylesheet '.tree-view-resizer', 'min-width', "#{width}px!important"
    @updateStylesheet '.tree-view-resizer', 'max-width', "#{width}px!important"

  applyPadding: (padding) ->
    @updateStylesheet '.tree-view-resizer:hover', 'padding-right', "#{padding}px"

  getStylesheet: ->
    return stylesheet if stylesheet?
    stylesheet = document.createElement 'style'
    stylesheet.type = 'text/css'
    document.querySelector('head atom-styles').appendChild stylesheet
    stylesheet

  updateStylesheet: (selector, property, value) ->
    sheet = @getStylesheet().sheet
    sheet.insertRule "#{selector} { #{property}: #{value}; }", sheet.cssRules.length

module.exports = new AutohideTreeView()