import { Plugin, normalizePath } from 'vite'
import { TransformResult, LoadResult, ResolveIdResult } from 'rollup'
import { dirname, join, relative } from 'path'
import { toRoot, transformJsx } from '../util'
import minimatch from 'minimatch'
import { getConfig } from '../config'
import { ContentPage, SelectPage, TaxonomyPage, TermsPage } from '../page'
import { getPageSources } from '../state'
import { MarkdownPageSource } from '../page-source'

const virtualPageRegex = /^@wilson\/page-source\/(\d+)\/page\/(\d+)/

/**
 * Wrap pages into wrapper components for <head> meta etc.
 */
const pagesPlugin = async (): Promise<Plugin> => {
  return {
    name: 'wilson-plugin-pages',
    enforce: 'pre',

    resolveId(id: string): ResolveIdResult {
      const match = id.match(virtualPageRegex)
      if (match === null) return
      return id
    },

    /**
     * @todo is this required?
     */
    load(id: string): LoadResult {
      const match = id.match(virtualPageRegex)
      if (match === null) return
      return 'wat'
    },

    async transform(code: string, id: string): Promise<TransformResult> {
      const match = id.match(virtualPageRegex)
      if (match === null) return

      const pageSourceIndex = parseInt(match[1], 10)
      const pageSource = getPageSources()[pageSourceIndex]
      const pageIndex = parseInt(match[2], 10)
      const page = pageSource.pages[pageIndex]

      const { autoPrefetch } = getConfig()

      if (page === undefined) {
        throw new Error('kaput!')
      }

      const { pageLayouts } = getConfig()
      const pageLayout =
        pageSource.frontmatter.layout ?? typeof pageLayouts === 'undefined'
          ? undefined
          : pageLayouts.find(({ pattern = '**' }) => {
              return minimatch(
                pageSource.fullPath.replace(
                  new RegExp(
                    `^${normalizePath(join(process.cwd(), 'src', 'pages'))}/`
                  ),
                  ''
                ),
                pattern
              )
            })?.layout

      const layoutImport = pageLayout
        ? `import Layout from '${relative(
            dirname(id),
            toRoot(`./src/layouts/${pageLayout}`)
          ).replace(/\\/g, '/')}';`
        : `import { Fragment as Layout } from 'preact';`

      const componentProps = `
        title="${page.title}"
        date={${+page.date}}
        ${
          page instanceof ContentPage
            ? `taxonomies={${JSON.stringify(page.taxonomies)}}`
            : ''
        }
        ${
          pageSource instanceof MarkdownPageSource
            ? `headings={${JSON.stringify(pageSource.headings)}}`
            : ''
        }
      `

      const wrapper = `
        import { h } from 'preact';
        import { useMeta, useTitle } from 'hoofd/preact';
        import { siteData } from 'wilson/virtual';
        ${
          autoPrefetch.enabled &&
          `import { useAutoPrefetch } from 'wilson/dist/client/context/prefetch'`
        };
        import { Page } from '${pageSource.fullPath}';
        ${layoutImport}

        export default function PageWrapper() {
          const pageUrl = siteData.siteUrl + '${page.route}';
          const title = '${page.title}';

          useMeta({ property: 'og:url', content: pageUrl });
          useMeta({ property: 'og:image', content: pageUrl + 'og-image.jpg' });
          useMeta({ property: 'og:image:secure_url', content: pageUrl + 'og-image.jpg' });
          useMeta({ property: 'og:title', content: title });
          useMeta({ property: 'og:type', content: '${
            pageSource.frontmatter.opengraphType
          }' });
          useMeta({ property: 'twitter:title', content: title });
          useTitle(title);
          ${
            autoPrefetch.enabled &&
            `useAutoPrefetch(${JSON.stringify(autoPrefetch)})`
          };
          
          return <Layout ${componentProps}>
            <Page
              ${componentProps}
              ${
                page instanceof TaxonomyPage || page instanceof SelectPage
                  ? `contentPages={${JSON.stringify(page.contentPages)}}
                     pagination={${JSON.stringify({
                       ...page.pagination,
                       ...page.paginationRoutes,
                     })}}`
                  : ''
              }
              ${
                page instanceof TaxonomyPage
                  ? `selectedTerm="${page.selectedTerm}"`
                  : ''
              }
              ${
                page instanceof TermsPage
                  ? `taxonomyTerms={${JSON.stringify(page.taxonomyTerms)}}`
                  : ''
              }
            />
          </Layout>;
        }
      `

      return {
        code: transformJsx(wrapper),
      }
    },
  }
}

export default pagesPlugin
