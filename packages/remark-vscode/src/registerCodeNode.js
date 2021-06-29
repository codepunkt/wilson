import tokenizeWithTheme from './tokenizeWithTheme.js'
import getTransformedLines from './transformers/getTransformedLines.js'
import { getGrammar } from './storeUtils.js'
import { joinClassNames } from './renderers/css.js'
import { uniq } from './utils.js'

export async function registerCodeBlock(
  codeBlockRegistry,
  registryKey,
  possibleThemes,
  getTextMateRegistry,
  lineTransformers,
  scope,
  text,
  languageName,
  meta,
  cache
) {
  const grammarCache = await cache.get('grammars')
  const [registry, unlockRegistry] = await getTextMateRegistry()
  try {
    const lines = await getTransformedLines(
      lineTransformers,
      text,
      languageName,
      meta
    )
    let tokenTypes = {}
    let languageId

    if (scope) {
      const grammarData = getGrammar(scope, grammarCache)
      languageId = grammarData.languageId
      tokenTypes = grammarData.tokenTypes
    }

    const addedClassNames = joinClassNames(
      ...uniq(lines.map((l) => l.setContainerClassName))
    )
    const grammar =
      languageId &&
      (await registry.loadGrammarWithConfiguration(scope, languageId, {
        tokenTypes,
      }))

    codeBlockRegistry.register(registryKey, {
      lines,
      text,
      meta,
      languageName,
      possibleThemes,
      isTokenized: !!grammar,
      tokenizationResults: possibleThemes.map((theme) =>
        tokenizeWithTheme(lines, theme, grammar, registry)
      ),
      className: addedClassNames || undefined,
    })
  } finally {
    unlockRegistry()
  }
}

export async function registerCodeSpan(
  codeBlockRegistry,
  registryKey,
  possibleThemes,
  getTextMateRegistry,
  scope,
  text,
  languageName,
  cache
) {
  const grammarCache = await cache.get('grammars')
  const [registry, unlockRegistry] = await getTextMateRegistry()
  try {
    const lines = [{ text, data: {}, attrs: {}, gutterCells: [] }]
    const { tokenTypes, languageId } = getGrammar(scope, grammarCache)
    const grammar = await registry.loadGrammarWithConfiguration(
      scope,
      languageId,
      { tokenTypes }
    )
    codeBlockRegistry.register(registryKey, {
      lines,
      text,
      meta: {},
      languageName,
      possibleThemes,
      isTokenized: true,
      tokenizationResults: possibleThemes.map((theme) =>
        tokenizeWithTheme(lines, theme, grammar, registry)
      ),
    })
  } finally {
    unlockRegistry()
  }
}
