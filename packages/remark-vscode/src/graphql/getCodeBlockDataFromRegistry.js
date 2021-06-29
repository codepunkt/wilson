import { renderHTML } from '../renderers/html.js'
import { joinClassNames } from '../renderers/css.js'
import { getThemeClassNames } from '../themeUtils.js'
import { flatMap, partitionOne, escapeHTML } from '../utils.js'
import {
  createTokenElement,
  createLineElement,
  createCodeBlockElement,
} from '../factory/html.js'

export default function getCodeBlockDataFromRegistry(
  registry,
  key,
  codeBlock,
  getWrapperClassName,
  getLineClassName
) {
  const { meta, index, languageName, text, possibleThemes, isTokenized } =
    codeBlock
  const lineElements = []
  const gqlLines = []
  registry.forEachLine(key, (line, lineIndex) => {
    let tokenElements
    const gqlTokens = []

    if (isTokenized) {
      registry.forEachToken(key, lineIndex, (token) => {
        const html = createTokenElement(token)
        // @ts-ignore - could be fixed with noImplicitAny
        ;(tokenElements || (tokenElements = [])).push(html)
        gqlTokens.push({
          ...token,
          className: html.attributes.class,
          html: renderHTML(html),
        })
      })
    } else {
      tokenElements = escapeHTML(line.text)
    }

    const html = createLineElement(
      line,
      meta,
      index,
      languageName,
      getLineClassName,
      tokenElements || ''
    )
    lineElements.push(html)
    gqlLines.push({
      ...line,
      className: html.attributes.class,
      tokens: gqlTokens,
      html: renderHTML(html),
    })
  })

  const wrapperClassNameValue = getWrapperClassName()
  const themeClassNames = flatMap(possibleThemes, getThemeClassNames)
  const preClassName = joinClassNames(
    'grvsc-container',
    wrapperClassNameValue,
    codeBlock.className,
    ...themeClassNames
  )
  const codeClassName = 'grvsc-code'
  const [defaultTheme, additionalThemes] = partitionOne(possibleThemes, (t) =>
    t.conditions.some((c) => c.condition === 'default')
  )

  return {
    index,
    text,
    meta,
    html: renderHTML(
      createCodeBlockElement(
        preClassName,
        codeClassName,
        languageName,
        index,
        lineElements
      )
    ),
    preClassName,
    codeClassName,
    language: languageName,
    defaultTheme,
    additionalThemes,
    tokenizedLines: isTokenized ? gqlLines : undefined,
  }
}
