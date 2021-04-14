import { Plugin } from 'vite'
import { LoadResult, ResolveIdResult } from 'rollup'
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
          `import { h, Fragment } from 'preact';` +
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
          `const markdownPages = ${markdownPages};` +
          `const siteMetadata = ${JSON.stringify(getOptions().siteMetadata)};` +
          `const twitterSite = siteMetadata.twitterSite ?? siteMetadata.twitterCreator;` +
          `const twitterCreator = siteMetadata.twitterCreator ?? siteMetadata.twitterSite;` +
          `const TwitterMeta = () => {` +
          `  useMeta({ property: 'twitter:site', content: twitterSite });` +
          `  useMeta({ property: 'twitter:creator', content: twitterCreator });` +
          `  return null;` +
          `};` +
          `const KeywordMeta = () => {` +
          `  useMeta({ name: 'keywords', content: (siteMetadata.keywords).join(',') });` +
          `};` +
          `const Meta = () => {` +
          `  const addTwitter = !!twitterSite || !!twitterCreator;` +
          `  useTitleTemplate(siteMetadata.titleTemplate);` +
          `  useMeta({ name: 'author', content: siteMetadata.author });` +
          `  useMeta({ name: 'description', content: siteMetadata.description });` +
          `  useMeta({ property: 'og:description', content: siteMetadata.description });` +
          `  useMeta({ property: 'og:site_name', content: siteMetadata.siteName });` +
          `  useMeta({ property: 'og:image:width', content: '1200' });` +
          `  useMeta({ property: 'og:image:height', content: '630' });` +
          `  useMeta({ property: 'twitter:card', content: 'summary_large_image' });` +
          `  useMeta({ property: 'og:site_name', content: siteMetadata.siteName });` +
          `  useMeta({ name: 'generator', content: 'Wilson ${
            require('wilson/package.json').version
          }' });` +
          `  return <Fragment>` +
          `    {addTwitter ? <TwitterMeta /> : null }` +
          `    {Array.isArray(siteMetadata.keywords) ? <KeywordMeta />: null }` +
          `  </Fragment>;` +
          `};` +
          `export { markdownPages, routes, siteMetadata, Meta };`
        return transformJsx(code)
      }
    },
  }
}

export default virtualPlugin
