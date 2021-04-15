import { HtmlTagDescriptor, Plugin } from 'vite'
import visit from 'unist-util-visit'
import is from 'unist-util-is'
import { resolveUserConfig } from '../config'
import { Node, Element } from 'hast'
import parse from 'rehype-parse'
import stringify from 'rehype-stringify'
import unified from 'unified'

const createMetaCreator = (attributeName: string) => (
  name: string,
  value: string
): HtmlTagDescriptor => ({
  tag: 'meta',
  injectTo: 'head',
  attrs: { [attributeName]: name, content: value },
})

const createNameMeta = createMetaCreator('name')
const createPropertyMeta = createMetaCreator('property')

/**
 * Transforms index html.
 *
 * - Adds `lang` attribute from siteData, defaulting to 'en'.
 * - Adds `meta` tags that don't change between pages.
 *
 * Certain meta tags like title, twitter:sitle, og:image, og:url or og:type
 * are page specific and thus handled by pages plugin.
 */
const indexHtmlPlugin = async (): Promise<Plugin> => {
  return {
    name: 'vite-plugin-wilson-indexhtml',
    enforce: 'pre',

    async transformIndexHtml(html: string) {
      const {
        siteData: {
          author,
          keywords,
          description,
          lang,
          siteName,
          twitterCreator,
          twitterSite,
        },
      } = await resolveUserConfig()

      interface Options {
        lang: string
      }
      const setLang = ({ lang }: Options) => {
        const visitor = (node: Node) => {
          if (is(node, { tagName: 'html' })) {
            const element = node as Element
            if (element.properties) {
              element.properties.lang = lang
            } else {
              element.properties = { lang }
            }
          }
        }
        return (tree: Node) => visit(tree, 'element', visitor)
      }

      const processor = unified()
        .use(parse)
        .use(setLang, { lang: lang ?? 'en' })
        .use(stringify)
      const vfile = processor.processSync(html)
      const result = vfile.contents

      return {
        html: result as string,
        tags: [
          // standard metas
          { tag: 'meta', attrs: { charset: 'utf-8' } },
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'x-ua-compatible', content: 'ie=edge' },
            injectTo: 'head',
          },
          // generator meta
          createNameMeta(
            'generator',
            `Wilson ${require('wilson/package.json').version}`
          ),
          // fixed metas
          createPropertyMeta('og:image:width', '1200'),
          createPropertyMeta('og:image:height', '630'),
          createPropertyMeta('twitter:card', 'summary_large_image'),
          // metas from siteData
          createNameMeta('author', author),
          createNameMeta('description', description),
          createPropertyMeta('og:description', description),
          createPropertyMeta('og:site_name', siteName),
          ...(Array.isArray(keywords)
            ? [createNameMeta('keywords', keywords.join(','))]
            : []),
          ...(twitterSite || twitterCreator
            ? [
                createPropertyMeta(
                  'twitter:site',
                  twitterSite ?? (twitterCreator as string)
                ),
                createPropertyMeta(
                  'twitter:creator',
                  twitterCreator ?? (twitterSite as string)
                ),
              ]
            : []),
        ],
      }
    },
  }
}

export default indexHtmlPlugin
