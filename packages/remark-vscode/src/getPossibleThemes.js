import {
  createDefaultTheme,
  createMatchMediaTheme,
  createParentSelectorTheme,
  concatConditionalThemes,
} from './themeUtils.js'

export default async function getPossibleThemes(
  themeOption,
  themeCache,
  contextDirectory,
  codeNodeData
) {
  if (typeof themeOption === 'function') {
    return getPossibleThemes(
      themeOption(codeNodeData),
      themeCache,
      contextDirectory,
      codeNodeData
    )
  }

  if (typeof themeOption === 'string') {
    return [await createDefaultTheme(themeOption, themeCache, contextDirectory)]
  }

  let themes
  if (themeOption.default) {
    themes = await getPossibleThemes(
      themeOption.default,
      themeCache,
      contextDirectory,
      codeNodeData
    )
  }
  if (themeOption.dark) {
    themes = concatConditionalThemes(themes, [
      await createMatchMediaTheme(
        themeOption.dark,
        '(prefers-color-scheme: dark)',
        themeCache,
        contextDirectory
      ),
    ])
  }
  if (themeOption.media) {
    themes = concatConditionalThemes(
      themes,
      await Promise.all(
        themeOption.media.map(
          async (setting) =>
            await createMatchMediaTheme(
              setting.theme,
              setting.match,
              themeCache,
              contextDirectory
            )
        )
      )
    )
  }
  if (themeOption.parentSelector) {
    themes = concatConditionalThemes(
      themes,
      await Promise.all(
        Object.keys(themeOption.parentSelector).map(
          async (key) =>
            await createParentSelectorTheme(
              themeOption.parentSelector[key],
              key,
              themeCache,
              contextDirectory
            )
        )
      )
    )
  }

  return themes
}
