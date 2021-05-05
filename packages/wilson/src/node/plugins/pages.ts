import { Plugin } from 'vite'
import { TransformResult, LoadResult, ResolveIdResult } from 'rollup'
import { dirname, relative } from 'path'
import { toRoot, transformJsx } from '../util'
import minimatch from 'minimatch'
import { getConfig } from '../config'
import cache from '../cache'
import PageFile from '../page-file'
import { getPagefiles, getPageSources, getTaxonomyTerms } from '../state'

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
      const page = pageSource.pageFiles[pageIndex]

      if (page === undefined) {
        throw new Error('kaput!')
      }

      const { pageLayouts } = await getConfig()
      const pageLayout =
        pageSource.frontmatter.layout ?? typeof pageLayouts === 'undefined'
          ? undefined
          : pageLayouts.find(({ pattern = '**' }) =>
              minimatch(
                pageSource.fullPath.replace(
                  new RegExp(`^${process.cwd()}/src/pages/`),
                  ''
                ),
                pattern
              )
            )?.layout

      /**
       * TaxonomyPages are given as props to kind = 'taxonomy' pages.
       *
       * The taxonomy is defined by the page's frontmatter.taxonomyName.
       *
       * If frontmatter.taxonomyTerms is defined, taxonomyPages is a
       * list of every page that matches one or more terms of the defined
       * taxonomy.
       *
       * If frontmatter.taxonomyTerms is not defined, a page is created for
       * every existing term of the taxonomy and taxonomyPages is a list of
       * every page that matches the specific term.
       */
      const taxonomyPages: PageFile[] = []
      if (pageSource.frontmatter.kind === 'taxonomy') {
        // eslint-disable-next-line
        const taxonomyName = pageSource.frontmatter.taxonomyName!

        const hasCommonElements = (arr1: string[], arr2: string[]): boolean => {
          return arr1.some((item) => arr2.includes(item))
        }

        const taxonomyTerms = pageSource.frontmatter.taxonomyTerms
        if (taxonomyTerms !== undefined) {
          taxonomyPages.push(
            ...getPagefiles().filter((p) => {
              const pageIds = taxonomyPages.map((p) => p.id)
              return (
                !pageIds.includes(p.id) &&
                hasCommonElements(
                  taxonomyTerms,
                  p.taxonomies?.[taxonomyName] ?? []
                )
              )
            })
          )
        } else {
          taxonomyPages.push(
            ...getPagefiles().filter((p) => {
              const pageIds = taxonomyPages.map((p) => p.id)
              return (
                page.taxonomyReplace &&
                !pageIds.includes(p.id) &&
                p.taxonomies?.[taxonomyName]?.includes(
                  page.taxonomyReplace.value
                )
              )
            })
          )
        }
      }

      let taxonomyTerms: Set<string> = new Set()
      if (pageSource.frontmatter.kind === 'term') {
        // eslint-disable-next-line
        const taxonomyName = pageSource.frontmatter.taxonomyName!

        taxonomyTerms = new Set([
          ...getPagefiles()
            .map((page) => {
              if (page.taxonomies === null) return []
              return page.taxonomies[taxonomyName] ?? []
            })
            .flat(),
        ])
      }

      const layoutImport = pageLayout
        ? `import Layout from '${relative(
            dirname(id),
            toRoot(`./src/layouts/${pageLayout}`)
          )}';`
        : `import { Fragment as Layout } from 'preact';`

      const componentProps = `
        title="${page.title}"
        date={${+page.date}}
        taxonomies={${JSON.stringify(page.taxonomies)}}
        tableOfContents={${JSON.stringify(
          cache.markdown.toc.get(pageSource.fullPath)
        )}}
      `

      const wrapper = `
        import { h } from 'preact';
        import { useMeta, useTitle } from 'hoofd/preact';
        import { siteData } from 'wilson/virtual';
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

          return <Layout ${componentProps}>
            <Page
              ${componentProps}
              ${
                pageSource.frontmatter.kind === 'taxonomy'
                  ? `taxonomyPages={${JSON.stringify(taxonomyPages)}}`
                  : ''
              }
              ${
                pageSource.frontmatter.kind === 'term'
                  ? `taxonomyTerms={${JSON.stringify(
                      Array.from(taxonomyTerms)
                    )}}`
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
