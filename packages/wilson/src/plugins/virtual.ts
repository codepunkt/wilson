import { Plugin } from 'vite'
import { LoadResult, ResolveIdResult } from 'rollup'
import { toRoot, transformJsx } from '../util'
import { resolveSiteData } from '../config'
import { mapPagePathToUrl } from '../page'
import cache from '../cache'

/**
 * Provides virtual import of routes and markdown page metadata.
 */
const virtualPlugin = async (): Promise<Plugin> => {
  const virtualImportPath = 'wilson/virtual'

  return {
    name: 'wilson-plugin-virtual',
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
     *
     * @TODO
     * export VirtualPage instead of Page, because Page has too much
     * information density that would increase clientside bundlesize on import
     */
    async load(id: string): Promise<LoadResult> {
      if (id.startsWith(virtualImportPath)) {
        const pages = cache.collections.all

        const code =
          `import { createContext, h } from 'preact';` +
          `import { useContext } from 'preact/hooks';` +
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
            .map(
              (page, i) =>
                `<Page${i} path="${mapPagePathToUrl(page.result.url)}" />`
            )
            .join(',') +
          `];` +
          `const PageContext = createContext(null);` +
          `const PageProvider = ({ children, collection = 'all' }) => (` +
          `  <PageContext.Provider value={${JSON.stringify(pages)}}>` +
          `    {children}` +
          `  </PageContext.Provider>` +
          `);` +
          `const usePages = () => useContext(PageContext);` +
          `const siteData = ${JSON.stringify(await resolveSiteData())};` +
          `export { routes, siteData, PageProvider, usePages };`
        return transformJsx(code)
      }
    },
  }
}

export default virtualPlugin
