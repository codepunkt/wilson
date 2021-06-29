import {
  groupConditions,
  getStylesFromThemeSettings,
  getThemeClassName,
  isDarkTheme,
} from '../themeUtils.js'
import { ruleset, declaration, media } from '../renderers/css.js'

export const boldDeclarations = [declaration('font-weight', 'bold')]
export const italicDeclarations = [declaration('font-style', 'italic')]
export const underlineDeclarations = [
  declaration('text-decoration', 'underline'),
  declaration('text-underline-position', 'under'),
]

export function createThemeCSSRules(
  theme,
  settings,
  tokenClassNames,
  replaceColor
) {
  const conditions = groupConditions(theme.conditions)
  const isDark = isDarkTheme(settings)
  const lineHighlightBackgroundDefault = isDark
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(0, 0, 0, 0.05)'
  const lineHighlightBorderDefault = isDark
    ? 'rgba(255, 255, 255, 0.5)'
    : 'rgba(0, 0, 0, 0.2)'
  const elements = []
  const containerStyles = getStylesFromThemeSettings(settings)
  if (conditions.default) {
    pushColorRules(
      elements,
      '.' + getThemeClassName(theme.identifier, 'default')
    )
  }
  for (const condition of conditions.parentSelector) {
    pushColorRules(
      elements,
      `${condition.value} .${getThemeClassName(
        theme.identifier,
        'parentSelector'
      )}`
    )
  }
  for (const condition of conditions.matchMedia) {
    const ruleset = []
    pushColorRules(
      ruleset,
      '.' + getThemeClassName(theme.identifier, 'matchMedia')
    )
    elements.push(media(condition.value, ruleset, theme.identifier))
  }
  return elements

  function pushColorRules(container, selector, leadingComment) {
    if (containerStyles.length) {
      container.push(ruleset(selector, containerStyles, leadingComment))
      leadingComment = undefined
    }
    for (const { className, css } of tokenClassNames) {
      container.push(
        ruleset(
          `${selector} .${className}`,
          css.map((decl) =>
            decl.property === 'color'
              ? declaration('color', replaceColor(decl.value, theme.identifier))
              : decl
          ),
          leadingComment
        )
      )
      leadingComment = undefined
    }

    container.push(
      ruleset(`${selector} .grvsc-line-highlighted::before`, {
        'background-color': `var(--grvsc-line-highlighted-background-color, ${lineHighlightBackgroundDefault})`,
        'box-shadow': `inset var(--grvsc-line-highlighted-border-width, 4px) 0 0 0 var(--grvsc-line-highlighted-border-color, ${lineHighlightBorderDefault})`,
      })
    )
  }
}
