import { renderHTML } from '../renderers/html.js'
import { partitionOne, flatMap } from '../utils.js'
import { createTokenElement, createCodeSpanElement } from '../factory/html.js'
import { getThemeClassNames } from '../themeUtils.js'
import { joinClassNames } from '../renderers/css.js'

export default function getCodeSpanDataFromRegistry(
  registry,
  key,
  codeSpan,
  getClassName
) {
  const { index, languageName, text, possibleThemes } = codeSpan
  const tokenElements = []
  const gqlTokens = []

  registry.forEachToken(key, 0, (token) => {
    const html = createTokenElement(token)
    tokenElements.push(html)
    gqlTokens.push({
      ...token,
      className: html.attributes.class,
      html: renderHTML(html),
    })
  })

  const customClassName = getClassName()
  const themeClassNames = flatMap(possibleThemes, getThemeClassNames)
  const className = joinClassNames(customClassName, ...themeClassNames)
  const html = createCodeSpanElement(
    index,
    languageName,
    className,
    tokenElements
  )
  const [defaultTheme, additionalThemes] = partitionOne(possibleThemes, (t) =>
    t.conditions.some((c) => c.condition === 'default')
  )

  return {
    index,
    text,
    html: renderHTML(html),
    language: languageName,
    className: getClassName(),
    defaultTheme,
    additionalThemes,
    tokens: gqlTokens,
  }
}
