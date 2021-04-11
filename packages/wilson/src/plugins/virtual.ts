import { Plugin } from 'vite'
import { LoadResult, ResolveIdResult } from 'rollup'
// @ts-ignore
import presetPreact from 'babel-preset-preact'
import { getPageData, toRoot, transformJsx } from '../util'
import { Options } from '../config'

/**
 * Provides virtual import of routes and markdown page metadata.
 */
const virtualPlugin = async (opts: Options = {}): Promise<Plugin> => {
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

        // routes added here will be available client side, but not prerendered (yet!)
        const code =
          `import { h } from 'preact';` +
          `import { lazy } from 'preact-iso';` +
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
          `const markdownPages = ${markdownPages};` +
          `export { markdownPages, routes };`
        return transformJsx(code)
      }
    },
  }
}

export default virtualPlugin
