import { last } from './utils.js'
import { loadTheme } from './themeUtils.js'

export default function tokenizeWithTheme(lines, theme, grammar, registry) {
  const rawTheme = loadTheme(theme.path)
  registry.setTheme(rawTheme)
  if (!grammar) {
    return {
      theme,
      lines: undefined,
      colorMap: registry.getColorMap(),
      settings: rawTheme.resultColors,
    }
  }

  const tokens = []
  let ruleStack = undefined
  for (const line of lines) {
    // Empty lines tokenize as a one-length token for some reason.
    // Seems weird and I don’t think there’s any reason to keep them.
    if (!line.text) {
      tokens.push([])
      continue
    }

    const binary = grammar.tokenizeLine2(line.text, ruleStack)
    const full = grammar.tokenizeLine(line.text, ruleStack).tokens
    const lineTokens = []
    for (const token of full) {
      lineTokens.push({
        start: token.startIndex,
        end: token.endIndex,
        scopes: token.scopes,
        metadata: getMetaAtPosition(binary.tokens, token.startIndex),
      })
    }
    tokens.push(lineTokens)
    ruleStack = binary.ruleStack
  }

  return {
    theme,
    lines: tokens,
    colorMap: registry.getColorMap(),
    settings: rawTheme.resultColors,
  }
}

function getMetaAtPosition(tokens, position) {
  for (let i = 0; i < tokens.length; i += 2) {
    const start = tokens[i]
    const end = tokens[i + 2]
    if (start <= position && position < end) {
      return tokens[i + 1]
    }
  }
  return last(tokens)
}
