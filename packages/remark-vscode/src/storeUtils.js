import path from 'path'
import { exists } from './utils.js'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

let grammarManifest
let themeManifest

function getGrammarManifest() {
  return (
    grammarManifest ||
    (grammarManifest = require('../lib/grammars/manifest.json'))
  )
}

function getThemeManifest() {
  return (
    themeManifest || (themeManifest = require('../lib/themes/manifest.json'))
  )
}

function resolveAlias(language, languageAliases) {
  return languageAliases[language] || language
}

export function getScope(language, grammarCache, languageAliases) {
  const resolvedLanguage = resolveAlias(language, languageAliases)
  const grammars = { ...getGrammarManifest(), ...grammarCache }
  for (const scopeName in grammars) {
    const grammar = grammars[scopeName]
    if (grammar.languageNames.includes(resolvedLanguage)) {
      return scopeName
    }
  }
}

export function getGrammarLocation(grammar) {
  return path.isAbsolute(grammar.path)
    ? grammar.path
    : path.resolve(__dirname, '../lib/grammars', grammar.path)
}

export async function ensureThemeLocation(
  themeNameOrId,
  themeCache,
  contextDirectory
) {
  const themes = { ...getThemeManifest(), ...themeCache }
  for (const themeId in themes) {
    const theme = themes[themeId]
    if (
      themeNameOrId === themeId ||
      themeNameOrId.toLowerCase() === theme.label.toLowerCase() ||
      (themeNameOrId === theme.packageName && theme.isOnlyThemeInPackage)
    ) {
      const themePath = path.isAbsolute(theme.path)
        ? theme.path
        : path.resolve(__dirname, '../lib/themes', theme.path)
      if (!(await exists(themePath))) {
        throw new Error(
          `Theme manifest lists '${themeNameOrId}' at '${themePath}, but no such file exists.'`
        )
      }
      return themePath
    }
    if (themeNameOrId === theme.packageName) {
      throw new Error(
        `Cannot identify theme by '${themeNameOrId}' because the extension contains more than one theme.`
      )
    }
  }

  const locallyResolved =
    contextDirectory && path.resolve(contextDirectory, themeNameOrId)
  if (!locallyResolved || !(await exists(locallyResolved))) {
    throw new Error(`Theme manifest does not contain theme '${themeNameOrId}'.`)
  }
  return locallyResolved
}

export function getHighestBuiltinLanguageId() {
  return Object.keys(getGrammarManifest()).reduce(
    (highest, scopeName) =>
      Math.max(highest, getGrammarManifest()[scopeName].languageId),
    1
  )
}

export function getGrammar(scopeName, grammarCache) {
  return getAllGrammars(grammarCache)[scopeName]
}

export function getAllGrammars(grammarCache) {
  return { ...getGrammarManifest(), ...grammarCache }
}
