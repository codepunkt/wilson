/**
 * Maps page type identifiers (e.g. `markdown`) to a list of
 * file extensions.
 */
export const pageFileTypes: Readonly<Record<string, string[]>> = {
  typescript: ['.tsx'],
  markdown: ['.md'],
}
