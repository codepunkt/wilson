import { Plugin } from 'vite'
import { TransformResult } from 'rollup'
import { dirname, extname, relative } from 'path'
import { getPageData, toRoot, transformJsx } from '../util'
import minimatch from 'minimatch'
import { resolveUserConfig } from '../config'

/**
 * Allowed file extensions for pages.
 */
export const pageTypes = {
  javascript: ['.js', '.jsx'],
  typescript: ['.tsx'],
  markdown: ['.md'],
}

/**
 * Wrap pages into wrapper components for <head> meta etc.
 */
const pagesPlugin = async (): Promise<Plugin> => {
  return {
    name: 'vite-plugin-wilson-pages',
    enforce: 'pre',

    async transform(code: string, id: string): Promise<TransformResult> {
      const extension = extname(id)
      if (!Object.values(pageTypes).flat().includes(extension)) return
      if (!id.startsWith(toRoot('./src/pages/'))) return

      const pages = await getPageData()
      const { pageLayouts } = await resolveUserConfig()
      const page = pages.find((p) => p.source.absolutePath === id)

      if (!page) {
        throw new Error(`pageData for page ${id} not found!`)
      }

      const pageLayout =
        page.frontmatter.layout ?? typeof pageLayouts === 'undefined'
          ? undefined
          : pageLayouts.find(({ pattern = '**' }) =>
              minimatch(
                id.replace(new RegExp(`^${process.cwd()}\/src\/pages\/`), ''),
                pattern
              )
            )?.component

      const wrapper =
        `import { useMeta, useTitle } from "hoofd/preact";` +
        `import { siteData } from "wilson/virtual";` +
        `${
          pageLayout
            ? `import Layout from '${relative(
                dirname(id),
                toRoot(`./src/layouts/${pageLayout}`)
              )}'`
            : `import { Fragment as Layout } from 'preact'`
        };` +
        `${code}` +
        `export default function PageWrapper() {` +
        `  const pageUrl = siteData.siteUrl + '${page.result.url}';` +
        `  const title = '${page.frontmatter.title}';` +
        `  useMeta({ property: 'og:url', content: pageUrl });` +
        `  useMeta({ property: 'og:image', content: pageUrl + 'og-image.jpg' });` +
        `  useMeta({ property: 'og:image:secure_url', content: pageUrl + 'og-image.jpg' });` +
        `  useMeta({ property: 'og:title', content: title });` +
        `  useMeta({ property: 'og:type', content: '${
          page.frontmatter.ogType ?? 'website'
        }' });` +
        `  useMeta({ property: 'twitter:title', content: title });` +
        `  useTitle(title);` +
        `  return <Layout frontmatter={${JSON.stringify(page.frontmatter)}}>` +
        `    <Page />` +
        `  </Layout>;` +
        `}`

      return {
        // jsx is automatically transformed for typescript,
        // we need to do it manually for markdown pages.
        code: extension === '.md' ? transformJsx(wrapper) : wrapper,
      }
    },
  }
}

export default pagesPlugin
