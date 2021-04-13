import { Plugin } from 'vite'
import { TransformResult } from 'rollup'
import { extname } from 'path'
import { getPageData, toRoot, transformJsx } from '../util'

/**
 * Allowed file extensions for pages.
 */
export const pageExtensions = ['.tsx', '.md']

/**
 * Wrap pages into wrapper components for <head> meta etc.
 */
const pagesPlugin = async (): Promise<Plugin> => {
  return {
    name: 'vite-plugin-wilson-pages',
    enforce: 'pre',

    async transform(code: string, id: string): Promise<TransformResult> {
      const extension = extname(id)
      if (!pageExtensions.includes(extension)) return
      if (!id.startsWith(toRoot('./src/pages/'))) return

      const pageData = await getPageData()
      const page = pageData.find((p) => p.source.absolutePath === id)

      if (!page) {
        throw new Error(`pageData for page ${id} not found!`)
      }

      const wrapper =
        `import { useMeta, useTitle } from "hoofd/preact";` +
        `import { siteMetadata } from "wilson/virtual";` +
        `${code}` +
        `export default function PageWrapper() {` +
        `  const pageUrl = siteMetadata.siteUrl + '${page.result.url}';` +
        `  useMeta({ property: 'og:url', content: pageUrl });` +
        `  useMeta({ property: 'og:image', content: pageUrl + 'og-image.jpg' });` +
        `  useMeta({ property: 'og:image:secure_url', content: pageUrl + 'og-image.jpg' });` +
        `  useTitle('${page.frontmatter.title}');` +
        `  useMeta({ property: 'og:title', content: '${page.frontmatter.title}' });` +
        `  useMeta({ property: 'twitter:title', content: '${page.frontmatter.title}' });` +
        `  return <Page />;` +
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
