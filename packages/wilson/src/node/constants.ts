/**
 * Maps page type identifiers (e.g. `markdown`) to a list of
 * file extensions.
 */
export const pageFileTypes: Readonly<Record<string, string[]>> = {
  typescript: ['.tsx'],
  markdown: ['.md'],
}

/**
 * Asset URL prefix.
 */
export const assetUrlPrefix = '_assetUrl_'

/**
 * Defines attributes on HTML/SVG elements that should be considered when
 * converting relative URLs to imports.
 */
export const assetUrlTagConfig: Record<string, string[]> = {
  video: ['src', 'poster'],
  source: ['src'],
  img: ['src'],
  image: ['xlink:href', 'href'],
  use: ['xlink:href', 'href'],
}
