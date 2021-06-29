import { last, flatMap, escapeHTML } from '../utils.js'
import { createThemeCSSRules } from './css.js'
import { joinClassNames } from '../renderers/css.js'
import {
  pre,
  code,
  span,
  style,
  TriviaRenderFlags,
  mergeAttributes,
} from '../renderers/html.js'

export function createTokenElement(token) {
  const className = joinClassNames(
    token.defaultThemeTokenData.className,
    ...token.additionalThemeTokenData.map((t) => t.className)
  )
  return span({ class: className }, [escapeHTML(token.text)], {
    whitespace: TriviaRenderFlags.NoWhitespace,
  })
}

export function createLineElement(
  line,
  meta,
  index,
  language,
  getLineClassName,
  tokens
) {
  const lineData = { meta, index, content: line.text, language }
  const lineClassName = joinClassNames(getLineClassName(lineData), 'grvsc-line')
  const attrs = mergeAttributes({ class: lineClassName }, line.attrs)
  const children =
    typeof tokens === 'string' ? [tokens] : mergeSimilarTokens(tokens)
  const gutterCells = line.gutterCells.map(createGutterCellElement)
  if (gutterCells.length) {
    gutterCells.unshift(
      span({ class: 'grvsc-gutter-pad' }, undefined, {
        whitespace: TriviaRenderFlags.NoWhitespace,
      })
    )
  }
  return span(
    attrs,
    [
      ...gutterCells,
      span({ class: 'grvsc-source' }, children, {
        whitespace: TriviaRenderFlags.NoWhitespace,
      }),
    ],
    { whitespace: TriviaRenderFlags.NoWhitespace }
  )
}

export function createGutterCellElement(cell) {
  return span(
    {
      class: joinClassNames('grvsc-gutter', cell && cell.className),
      'aria-hidden': 'true',
      'data-content': cell && cell.text,
    },
    [],
    { whitespace: TriviaRenderFlags.NoWhitespace }
  )
}

export function createCodeSpanElement(index, language, className, tokens) {
  return code(
    { class: className, 'data-language': language, 'data-index': index },
    tokens,
    {
      whitespace: TriviaRenderFlags.NoWhitespace,
    }
  )
}

/**
 * Returns the token element array with contiguous spans having the same class name
 * merged into a single span to minimize the number of elements returned.
 */
export function mergeSimilarTokens(tokenElements) {
  return tokenElements.reduce((elements, element) => {
    const prev = last(elements)
    if (
      typeof prev === 'object' &&
      element.attributes.class === prev.attributes.class
    ) {
      prev.children.push(...element.children)
    } else {
      elements.push(element)
    }
    return elements
  }, [])
}

export function createCodeBlockElement(
  preClassName,
  codeClassName,
  languageName,
  index,
  lineElements
) {
  return pre(
    { class: preClassName, 'data-language': languageName, 'data-index': index },
    [
      code({ class: codeClassName }, lineElements, {
        whitespace: TriviaRenderFlags.NewlineBetweenChildren,
      }),
    ],
    { whitespace: TriviaRenderFlags.NoWhitespace }
  )
}

export function createStyleElement(
  possibleThemes,
  getTokenStylesForTheme,
  replaceColor,
  injectedStyles
) {
  const rules = flatMap(possibleThemes, ({ theme, settings }) => {
    return createThemeCSSRules(
      theme,
      settings,
      getTokenStylesForTheme(theme.identifier),
      replaceColor
    )
  })

  if (rules.length || injectedStyles) {
    return style({ class: 'grvsc-styles' }, [injectedStyles || '', ...rules])
  }
}
