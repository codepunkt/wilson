import { Plugin } from 'vite'
import { LoadResult, ResolveIdResult } from 'rollup'
import { toRoot, transformJsx } from '../util'
import { resolveSiteData } from '../config'
import { mapPagePathToUrl } from '../page'
import cache from '../cache'

const virtualExportsPath = 'wilson/virtual'
const clientEntryPath = '/@wilson/client.js'

/**
 * Provides virtual modules.
 */
const virtualPlugin = async (): Promise<Plugin> => {
  return {
    name: 'wilson-plugin-virtual',
    enforce: 'pre',

    resolveId(id: string): ResolveIdResult {
      if (id === virtualExportsPath || id === clientEntryPath) {
        return id
      }
    },

    /**
     * Provide virtual module content.
     *
     * @TODO
     * export VirtualPage instead of Page, because Page has too much
     * information density that would increase clientside bundlesize on import
     */
    async load(id: string): Promise<LoadResult> {
      if (id === clientEntryPath) {
        return `import "wilson/dist/client/main.js";`
      }

      if (id === virtualExportsPath) {
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
          `const PageProvider = ({ children }) => (` +
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
