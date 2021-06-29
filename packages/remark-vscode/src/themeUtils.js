import { createHash } from 'crypto'
import { declaration } from './renderers/css.js'
import { sanitizeForClassName } from './utils.js'
import { ensureThemeLocation } from './storeUtils.js'
import { loadColorTheme } from '../lib/vscode/colorThemeData.js'

function getThemeHash(themeIdentifier) {
  return createHash('md5')
    .update(themeIdentifier)
    .digest('base64')
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .substr(0, 5)
}

export function getThemePrefixedTokenClassName(
  canonicalClassName,
  themeIdentifier
) {
  return (
    'grvsc-t' +
    getThemeHash(themeIdentifier) +
    '-' +
    canonicalClassName.substr('mtk'.length)
  )
}

export function getThemeClassNames(theme) {
  return theme.conditions.map(({ condition }) =>
    getThemeClassName(theme.identifier, condition)
  )
}

export function getThemeClassName(themeIdentifier, conditionKind) {
  switch (conditionKind) {
    case 'default':
      return sanitizeForClassName(themeIdentifier)
    case 'matchMedia':
      return 'grvsc-mm-t' + getThemeHash(themeIdentifier)
    case 'parentSelector':
      return 'grvsc-ps-t' + getThemeHash(themeIdentifier)
    default:
      throw new Error(`Unrecognized theme condition '${conditionKind}'`)
  }
}

export function concatConditionalThemes(arr1, arr2) {
  if (!arr1) arr1 = []
  arr2.forEach(addTheme)
  return arr1

  function addTheme(theme) {
    const existing = arr1.find((t) => t.identifier === theme.identifier)
    if (existing) {
      if (conditionalThemesAreEqual(existing, theme)) return
      existing.conditions = concatConditions(
        existing.conditions,
        theme.conditions
      )
    } else {
      arr1 = arr1.concat(theme)
    }
  }
}

export async function createDefaultTheme(
  identifier,
  themeCache,
  contextDirectory
) {
  return {
    identifier,
    path: await ensureThemeLocation(identifier, themeCache, contextDirectory),
    conditions: [{ condition: 'default' }],
  }
}

export async function createMatchMediaTheme(
  identifier,
  match,
  themeCache,
  contextDirectory
) {
  return {
    identifier,
    path: await ensureThemeLocation(identifier, themeCache, contextDirectory),
    conditions: [{ condition: 'matchMedia', value: match }],
  }
}

export async function createParentSelectorTheme(
  identifier,
  parentSelector,
  themeCache,
  contextDirectory
) {
  return {
    identifier,
    path: await ensureThemeLocation(identifier, themeCache, contextDirectory),
    conditions: [{ condition: 'parentSelector', value: parentSelector }],
  }
}

function concatConditions(arr1, arr2) {
  arr2.forEach(addCondition)
  return arr1

  function addCondition(condition) {
    if (!arr1.some((c) => !compareConditions(c, condition))) {
      arr1 = arr1.concat(condition)
    }
  }
}

function conditionalThemesAreEqual(a, b) {
  if (a.identifier !== b.identifier) return false
  if (a.conditions.length !== b.conditions.length) return false
  const aConditions = sortConditions(a.conditions)
  const bConditions = sortConditions(b.conditions)
  for (let i = 0; i < aConditions.length; i++) {
    if (compareConditions(aConditions[i], bConditions[i])) {
      return false
    }
  }
  return true
}

function sortConditions(conditions) {
  return conditions.slice().sort(compareConditions)
}

function compareConditions(a, b) {
  if (a.condition < b.condition) return -1
  if (a.condition > b.condition) return 1
  switch (a.condition) {
    case 'matchMedia': {
      const bValue = b.value
      if (a.value < bValue) return -1
      if (a.value > bValue) return 1
    }
  }
  return 0
}

export function groupConditions(conditions) {
  return {
    default: conditions.find((c) => c.condition === 'default'),
    matchMedia: conditions.filter((c) => c.condition === 'matchMedia'),
    parentSelector: conditions.filter((c) => c.condition === 'parentSelector'),
  }
}

const settingPropertyMap = {
  'editor.background': 'background-color',
  'editor.foreground': 'color',
}

export function getStylesFromThemeSettings(settings) {
  const decls = []
  for (const key in settings) {
    const property = settingPropertyMap[key]
    if (property) {
      decls.push(declaration(property, settings[key]))
    }
  }
  return decls
}

export function loadTheme(themePath) {
  const { resultRules: tokenColors, resultColors: settings } =
    loadColorTheme(themePath)
  const defaultTokenColors = {
    settings: {
      foreground: settings['editor.foreground'] || settings.foreground,
      background: settings['editor.background'] || settings.background,
    },
  }
  return {
    settings: [defaultTokenColors, ...tokenColors],
    resultColors: settings,
  }
}

export function isDarkTheme(settings) {
  const background = settings['editor.background'] || settings.background
  if (!background) return false
  const color = parseColor(background)
  const lightness = perceivedLightness(color)
  return lightness < 50
}

function parseColor(colorString) {
  if (colorString[0] === '#') {
    return parseHexColor(colorString)
  }
  if (colorString.startsWith('rgb')) {
    return parseRGBOrRGBAColor(colorString)
  }
}

function parseHexColor(colorString) {
  if (colorString.length === 4) {
    const r = parseHexColorComponent(colorString[1])
    const g = parseHexColorComponent(colorString[2])
    const b = parseHexColorComponent(colorString[3])
    if (r !== false && g !== false && b !== false) {
      return { r, g, b, a: 1 }
    }
  }
  if (colorString.length === 7 || colorString.length === 9) {
    const r = parseHexColorComponent(colorString.substr(1, 2))
    const g = parseHexColorComponent(colorString.substr(3, 2))
    const b = parseHexColorComponent(colorString.substr(5, 2))
    const a =
      colorString.length === 9
        ? parseHexColorComponent(colorString.substr(7, 2))
        : 1
    if (r !== false && g !== false && b !== false && a !== false) {
      return { r, g, b, a }
    }
  }
}

function parseHexColorComponent(component) {
  const val = +`0x${component.repeat(3 - component.length)}`
  return isNaN(val) ? false : val / 255
}

const rgbRegExp = /^rgb\( *([^,\)]+), *([^,\)]+), *([^,\)]+) *\)/
const rgbaRegExp = /^rgba\( *([^,\)]+), *([^,\)]+), *([^,\)]+), *([^,\)]+) *\)/

function parseRGBOrRGBAColor(colorString) {
  const hasAlpha = colorString.startsWith('rgba')
  const match = (hasAlpha ? rgbaRegExp : rgbRegExp).exec(colorString)
  if (!match) return undefined
  const [r, g, b, a = 1] = match.slice(1).map(parseRGBAColorComponent)
  if (r !== false && g !== false && b !== false && a !== false) {
    return { r, g, b, a }
  }
}

function parseRGBAColorComponent(component) {
  const val = +component
  return isNaN(val) ? false : val
}

function luminance(color) {
  return (
    0.2126 * sRGBtoLin(color.r) +
    0.7152 * sRGBtoLin(color.g) +
    0.0722 * sRGBtoLin(color.b)
  )
}

function perceivedLightness(color) {
  const y = luminance(color)
  if (y <= 216 / 24389) {
    return (y * 24389) / 27
  }
  return Math.pow(y, 1 / 3) * 116 - 16
}

function sRGBtoLin(colorChannel) {
  if (colorChannel <= 0.04045) {
    return colorChannel / 12.92
  }
  return Math.pow((colorChannel + 0.055) / 1.055, 2.4)
}
