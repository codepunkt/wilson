import path from 'path'
import process from 'process'
import logger from 'loglevel'
import {
  getLanguageNames,
  requireJson,
  requirePlistOrJson,
  exists,
  readFile,
  readdir,
} from './utils.js'
import { createRequire } from 'module'
import { getHighestBuiltinLanguageId } from './storeUtils.js'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const unzipDir = path.resolve(__dirname, '../lib/extensions')

// const requireMain = createRequire(require.main.filename)
const require = createRequire(import.meta.url)
const requireCwd = createRequire(path.join(process.cwd(), 'index.js'))

export async function processExtension(packageJsonPath) {
  const packageJson = requireJson(packageJsonPath)
  let grammars = {}
  let themes = {}
  if (packageJson.contributes && packageJson.contributes.grammars) {
    const manifest = await Promise.all(
      packageJson.contributes.grammars.map(async (grammar) => {
        const sourcePath = path.resolve(
          path.dirname(packageJsonPath),
          grammar.path
        )
        const content = await requirePlistOrJson(sourcePath)
        const { scopeName } = content
        const languageRegistration = packageJson.contributes.languages.find(
          (l) => l.id === grammar.language
        )
        const languageNames = languageRegistration
          ? getLanguageNames(languageRegistration)
          : []
        logger.info(
          `Registering grammar '${scopeName}' from package ${packageJson.name} with language names: ${languageNames}`
        )

        return {
          languageId: 0, // Overwritten elsewhere
          scopeName,
          path: sourcePath,
          tokenTypes: toStandardTokenTypes(grammar.tokenTypes),
          embeddedLanguages: grammar.embeddedLanguages,
          injectTo: grammar.injectTo,
          languageNames,
        }
      })
    )

    grammars = manifest.reduce(
      (hash, grammar) => ({
        ...hash,
        [grammar.scopeName]: grammar,
      }),
      {}
    )
  }

  if (packageJson.contributes && packageJson.contributes.themes) {
    const manifest = await Promise.all(
      packageJson.contributes.themes.map(async (theme) => {
        const sourcePath = path.resolve(
          path.dirname(packageJsonPath),
          theme.path
        )
        const themeContents = await requirePlistOrJson(sourcePath)
        const id = theme.id || path.basename(theme.path).split('.')[0]
        logger.info(
          `Registering theme '${theme.label || id}' from package ${
            packageJson.name
          }`
        )

        return {
          id,
          path: sourcePath,
          label: theme.label,
          include: themeContents.include,
          packageName: packageJson.name,
          isOnlyThemeInPackage: packageJson.contributes.themes.length === 1,
        }
      })
    )

    themes = manifest.reduce(
      (hash, theme) => ({
        ...hash,
        [theme.id]: theme,
      }),
      {}
    )
  }

  return { grammars, themes }
}

async function mergeCache(cache, key, value) {
  cache.set(key, { ...cache.get(key), ...value })
}

async function getExtensionPackageJsonPath(specifier, host) {
  const absolute = path.isAbsolute(specifier)
    ? specifier
    : requireResolveExtension(specifier)
  const ext = path.extname(absolute)
  if (ext.toLowerCase() === '.vsix' || ext.toLowerCase() === '.zip') {
    const outDir = path.join(unzipDir, path.basename(absolute, ext))
    await host.decompress(await readFile(absolute), outDir)
    return searchDirectory(outDir)
  }

  return absolute

  async function searchDirectory(dir, stop = false) {
    if (await exists(path.join(dir, 'extension', 'package.json'))) {
      return path.join(dir, 'extension', 'package.json')
    }
    if (await exists(path.join(dir, 'package.json'))) {
      return path.join(dir, 'package.json')
    }
    if (stop) {
      return
    }

    for (const subdir of await readdir(dir, { withFileTypes: true })) {
      if (subdir.isDirectory) {
        const result = await searchDirectory(path.join(dir, subdir.name), true)
        if (result) {
          return result
        }
      }
    }
  }
}

/**
 * We want to resolve the extension from the context of the user’s gatsby-config,
 * but this turns out to be difficult. Ideally, gatsby and this plugin are installed
 * in the same node_modules directory as the extension, but gatsby could be invoked
 * globally, and this plugin could be npm linked. If both of those things happen, we
 * can also try resolving from the current working directory. One of these will
 * probably always work.
 */
function requireResolveExtension(specifier) {
  return (
    tryResolve(require) ||
    // tryResolve(requireMain) || // file name that node was executed with
    tryResolve(requireCwd) ||
    require.resolve(path.join(specifier, 'package.json'))
  ) // If none work, throw the best error stack

  function tryResolve(req) {
    try {
      return req.resolve(path.join(specifier, 'package.json'))
    } catch (_) {
      return undefined
    }
  }
}

export async function processExtensions(extensions, host, cache) {
  let languageId = getHighestBuiltinLanguageId() + 1
  for (const extension of extensions) {
    const packageJsonPath = await getExtensionPackageJsonPath(extension, host)
    const { grammars, themes } = await processExtension(packageJsonPath)
    Object.keys(grammars).forEach(
      (scopeName) => (grammars[scopeName].languageId = languageId++)
    )
    await mergeCache(cache, 'grammars', grammars)
    await mergeCache(cache, 'themes', themes)
  }
}

function toStandardTokenTypes(tokenTypes) {
  return (
    tokenTypes &&
    Object.keys(tokenTypes).reduce(
      (map, selector) => ({
        ...map,
        [selector]: toStandardTokenType(tokenTypes[selector]),
      }),
      {}
    )
  )
}

function toStandardTokenType(tokenType) {
  switch (tokenType.toLowerCase()) {
    case 'comment':
      return 1
    case 'string':
      return 2
    case 'regex':
      return 4
    default:
      return 0
  }
}
