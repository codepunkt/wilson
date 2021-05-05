import { Plugin } from 'vite'
import { LoadResult, ResolveIdResult } from 'rollup'
import { transformJsx } from '../util'
import { getConfig } from '../config'
import { getPagefiles, getPageSources } from '../state'

const virtualExportsPath = 'wilson/virtual'
const clientEntryPath = '/@wilson/client.js'
const pageEntryPath = (pageSourceIndex: number, pageIndex: number) =>
  `@wilson/page-source/${pageSourceIndex}/page/${pageIndex}`

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
     */
    async load(id: string): Promise<LoadResult> {
      if (id === clientEntryPath) {
        return `import "wilson/dist/client/main.js";`
      }

      if (id === virtualExportsPath) {
        const pageSources = getPageSources()
        const pageFiles = getPagefiles()

        const lazyPageImports = pageSources
          .map((pageSource, i) =>
            pageSource.pageFiles.map((pageFile, j) => {
              return `const PageSource${i}Page${j} = lazy(() => import('${pageEntryPath(
                i,
                j
              )}'));`
            })
          )
          .flat()
          .join('\n')

        const routes = pageSources
          .map((pageSource, i) =>
            pageSource.pageFiles.map(
              (pageFile, j) =>
                `<PageSource${i}Page${j} path="${pageFile.route}" />`
            )
          )
          .flat()
          .join(',')

        const code = `
          import { createContext, h } from 'preact';
          import { useContext } from 'preact/hooks';
          import { lazy } from 'preact-iso';

          ${lazyPageImports}
          const routes = [${routes}];
          const PageContext = createContext(null);
          const PageProvider = ({ children }) => (
            <PageContext.Provider value={${JSON.stringify(pageFiles)}}>
              {children}
            </PageContext.Provider>
          );
          const usePages = () => useContext(PageContext);
          const siteData = ${JSON.stringify((await getConfig()).siteData)};
          
          export { routes, siteData, PageProvider, usePages };
        `

        return transformJsx(code)
      }
    },
  }
}

export default virtualPlugin
