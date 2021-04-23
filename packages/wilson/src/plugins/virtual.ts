import { Plugin } from 'vite'
import { LoadResult, ResolveIdResult } from 'rollup'
import { toRoot, transformJsx } from '../util'
import { resolveSiteData } from '../config'
import { getPageData, mapPagePathToUrl } from '../page'
import { basename, extname } from 'path'
import readdirp from 'readdirp'
import { pageTypes } from './pages'
import { Page } from '../types'

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
        const pageDir = `${process.cwd()}/src/pages`
        const pages: Page[] = []

        for await (const { path, fullPath } of readdirp(pageDir)) {
          const extension = extname(basename(path))
          if (!Object.values(pageTypes).flat().includes(extension)) continue
          pages.push(await getPageData(fullPath))
        }

        const markdownPages = JSON.stringify(
          pages.filter((page) => extname(page.source.path) === '.md')
        )

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
            .map(
              (page, i) =>
                `<Page${i} path="${mapPagePathToUrl(page.result.url)}" />`
            )
            .join(',') +
          `];` +
          `const markdownPages = ${markdownPages};` +
          `const siteData = ${JSON.stringify(await resolveSiteData())};` +
          `export { markdownPages, routes, siteData };`
        return transformJsx(code)
      }
    },
  }
}

export default virtualPlugin
