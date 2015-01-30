'use strict'
class AutohideTreeView
  stylesheet = null

  config:
    unfoldSpeed:
      description: 'The speed of the unfold animation from 0-10. Higher is faster animation, 0 turns of the animation.'
      type: 'number'
      default: 2.5
      minimum: 0
      maximum: 10

  activate: ->
    @unfoldSpeedSub = atom.config.observe 'autohide-tree-view.unfoldSpeed', (speed) => @applyUnfoldSpeed speed

  deactivate: ->
    @unfoldSpeedSub.dispose()

  applyUnfoldSpeed: (speed) ->
    duration = if speed is 0 then 0 else 1 / speed
    @updateStylesheet '.tree-view-resizer', 'transition-duration', "#{duration}s"

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