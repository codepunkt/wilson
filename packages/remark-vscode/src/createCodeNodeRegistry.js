import {
  boldDeclarations,
  italicDeclarations,
  underlineDeclarations,
} from './factory/css.js'
import {
  getThemePrefixedTokenClassName,
  concatConditionalThemes,
} from './themeUtils.js'
import { getTokenDataFromMetadata } from '../lib/vscode/modes.js'
import { declaration } from './renderers/css.js'

export default function createCodeNodeRegistry({ prefixAllClassNames } = {}) {
  const blockMap = new Map()
  const spanMap = new Map()
  let themes = []
  const themeColors = new Map()
  let themeTokenClassNameMap
  let zippedLines

  return {
    register: (key, data) => {
      const map = key.type === 'code' ? blockMap : spanMap
      map.set(key, { ...data, index: map.size })
      themes = concatConditionalThemes(themes, data.possibleThemes)
      data.tokenizationResults.forEach(({ theme, colorMap, settings }) =>
        themeColors.set(theme.identifier, { colorMap, settings })
      )
    },
    forEachLine: (node, action) => blockMap.get(node).lines.forEach(action),
    forEachToken: (node, lineIndex, tokenAction) => {
      generateClassNames()
      const map = node.type === 'code' ? blockMap : spanMap
      const { tokenizationResults, isTokenized, lines } = map.get(node)
      if (!isTokenized) {
        return
      }

      const line = lines[lineIndex]
      const zipped = zippedLines.get(node)[lineIndex]

      zipped.forEach((tokens) => {
        let defaultThemeTokenData
        const additionalThemeTokenData = []

        tokens.forEach(({ metadata }, i) => {
          const { theme } = tokenizationResults[i]
          const themeClassNames = themeTokenClassNameMap.get(theme.identifier)
          const tokenData = getTokenDataFromMetadata(metadata)
          const { colorMap } = themeColors.get(theme.identifier)
          const isDefaultTheme = theme.conditions.some(
            (c) => c.condition === 'default'
          )
          const data = {
            themeIdentifier: theme.identifier,
            className: tokenData.classNames
              .map((c) => themeClassNames.get(c))
              .join(' '),
            bold: tokenData.bold,
            italic: tokenData.italic,
            underline: tokenData.underline,
            meta: metadata,
            color: getColorFromColorMap(colorMap, tokenData.classNames[0]),
          }
          if (isDefaultTheme) {
            defaultThemeTokenData = data
          } else {
            additionalThemeTokenData.push(data)
          }
        })

        tokenAction({
          text: line.text.slice(tokens[0].start, tokens[0].end),
          startIndex: tokens[0].start,
          endIndex: tokens[0].end,
          scopes: tokens[0].scopes,
          defaultThemeTokenData,
          additionalThemeTokenData,
        })
      })
    },
    forEachCodeBlock: blockMap.forEach.bind(blockMap),
    forEachCodeSpan: spanMap.forEach.bind(spanMap),
    getAllPossibleThemes: () =>
      themes.map((theme) => ({
        theme,
        settings: themeColors.get(theme.identifier).settings,
      })),
    getTokenStylesForTheme: (themeIdentifier) => {
      const result = []
      const colors = themeColors.get(themeIdentifier)
      const classNameMap =
        themeTokenClassNameMap && themeTokenClassNameMap.get(themeIdentifier)
      if (classNameMap) {
        classNameMap.forEach((className, canonicalClassName) => {
          if (canonicalClassName === 'mtkb') {
            result.unshift({ className, css: boldDeclarations })
          } else if (canonicalClassName === 'mtki') {
            result.unshift({ className, css: italicDeclarations })
          } else if (canonicalClassName === 'mtku') {
            result.unshift({
              className,
              css: underlineDeclarations,
            })
          } else {
            result.push({
              className,
              css: [
                declaration(
                  'color',
                  getColorFromColorMap(colors.colorMap, canonicalClassName)
                ),
              ],
            })
          }
        })
      }

      return result
    },
  }

  function generateClassNames() {
    if (themeTokenClassNameMap) return
    themeTokenClassNameMap = new Map()
    zippedLines = new Map()
    blockMap.forEach(generate)
    spanMap.forEach(generate)

    function generate({ lines, tokenizationResults, isTokenized }, node) {
      if (!isTokenized) return
      const zippedLinesForNode = []
      zippedLines.set(node, zippedLinesForNode)
      lines.forEach((_, lineIndex) => {
        const zipped = zipLineTokens(
          tokenizationResults.map((t) => t.lines[lineIndex])
        )
        zippedLinesForNode[lineIndex] = zipped
        zipped.forEach((tokensAtPosition) => {
          tokensAtPosition.forEach((token, themeIndex) => {
            const canonicalClassNames = getTokenDataFromMetadata(
              token.metadata
            ).classNames
            const { theme } = tokenizationResults[themeIndex]
            let themeClassNames = themeTokenClassNameMap.get(theme.identifier)
            if (!themeClassNames) {
              themeClassNames = new Map()
              themeTokenClassNameMap.set(theme.identifier, themeClassNames)
            }
            canonicalClassNames.forEach((canonicalClassName) => {
              themeClassNames.set(
                canonicalClassName,
                prefixAllClassNames || tokensAtPosition.length > 1
                  ? getThemePrefixedTokenClassName(
                      canonicalClassName,
                      theme.identifier
                    )
                  : canonicalClassName
              )
            })
          })
        })
      })
    }
  }
}

/**
 * normalizeLineTokens([
 *   [{ start: 0, end: 10, metadata: X }],
 *   [{ start: 0, end:  5, metadata: Y }, { start: 5, end: 10, metadata: Z }]
 * ]);
 *
 * // Result:
 * [
 *   [{ start: 0, end:  5, metadata: X }, { start: 0, end:  5, metadata: Y }],
 *   [{ start: 5, end: 10, metadata: X }, { start: 5, end: 10, metadata: Z }]
 * ]
 */
function zipLineTokens(lineTokenSets) {
  lineTokenSets = lineTokenSets.map((lineTokens) => lineTokens.slice())
  const result = []
  let start = 0
  // eslint-disable-next-line
  while (true) {
    const end = Math.min(
      ...lineTokenSets.map((lineTokens) =>
        lineTokens[0] ? lineTokens[0].end : 0
      )
    )
    if (start >= end) break

    const tokensAtPosition = []
    for (let i = 0; i < lineTokenSets.length; i++) {
      const token = lineTokenSets[i].shift()
      if (token.start === start && token.end === end) {
        tokensAtPosition.push(token)
      } else {
        tokensAtPosition.push({
          start,
          end,
          metadata: token.metadata,
          scopes: token.scopes,
        })
        lineTokenSets[i].unshift(token)
      }
    }
    result.push(tokensAtPosition)
    start = end
  }
  return result
}

function getColorFromColorMap(colorMap, canonicalClassName) {
  const index = +canonicalClassName.slice('mtk'.length)
  if (!Number.isInteger(index) || index < 1) {
    throw new Error(
      `Canonical class name must be in form 'mtk{Integer greater than 0}'. Received '${canonicalClassName}'.`
    )
  }
  return colorMap[index]
}
