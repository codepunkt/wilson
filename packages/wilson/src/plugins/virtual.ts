import { Plugin } from 'vite'
import { LoadResult, ResolveIdResult } from 'rollup'
// @ts-ignore
import presetPreact from 'babel-preset-preact'
import { getPageData, toRoot, transformJsx } from '../util'
import { getOptions } from '../config'

/**
 * Provides virtual import of routes and markdown page metadata.
 */
const virtualPlugin = async (): Promise<Plugin> => {
  const virtualImportPath = 'wilson/virtual'

  return {
    name: 'vite-plugin-wilson-core',
    enforce: 'pre',

    /**
     * Resolve wilson/virtual imports
     */
    resolveId(id: string): ResolveIdResult {
      if (id.startsWith(virtualImportPath)) {
        return id
      }
    },

    /**
     * Provide content for wilson/virtual imports
     */
    async load(id: string): Promise<LoadResult> {
      if (id.startsWith(virtualImportPath)) {
        const pages = await getPageData()
        const markdownPages = JSON.stringify(
          pages.filter((page) => page.type === 'markdown')
        )

        const code =
          `import { h } from 'preact';` +
          `import { lazy } from 'preact-iso';` +
          `import { useMeta, useTitleTemplate } from 'hoofd/preact';` +
          pages
            .map(
              (page, i) =>
                `const Page${i} = lazy(() => import('${toRoot(
                  `/src/pages/${page.source.path}`
                )}'));`
            )
            .join('\n') +
          `const routes = [` +
          pages
            .map((page, i) => `<Page${i} path="${page.result.url}" />`)
            .join(',') +
          `];` +
          `const siteMetadata = ${JSON.stringify(getOptions().siteMetadata)};` +
          `const markdownPages = ${markdownPages};` +
          `const Meta = () => {` +
          `  const meta = ${JSON.stringify(getOptions().siteMetadata)};` +
          `  console.log({meta});` +
          `  useTitleTemplate(meta.titleTemplate);` +
          `  useMeta({ name: 'author', content: meta.author });` +
          `  useMeta({ name: 'description', content: meta.description });` +
          `  useMeta({ property: 'og:image', content: 'og-image.jpg' });` +
          `  useMeta({ property: 'og:site_name', content: meta.siteName });` +
          `  return null;` +
          `};` +
          `export { markdownPages, routes, siteMetadata, Meta };`
        return transformJsx(code)
      }
    },
  }
}

export default virtualPlugin
