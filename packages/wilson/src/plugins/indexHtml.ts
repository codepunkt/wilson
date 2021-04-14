import { Plugin } from 'vite'
import visit from 'unist-util-visit'
import is from 'unist-util-is'
import { getOptions } from '../config'
import { Node, Element } from 'hast'
import parse from 'rehype-parse'
import stringify from 'rehype-stringify'
import unified from 'unified'

/**
 * Transforms index html.
 *
 * - Adds `lang` attribute from `siteMetadata, defaulting to 'en'
 */
const indexHtmlPlugin = async (): Promise<Plugin> => {
  return {
    name: 'vite-plugin-wilson-indexhtml',
    enforce: 'pre',

    transformIndexHtml(html: string) {
      const {
        siteMetadata: { lang: metaLang },
      } = getOptions()

      const visitor = (node: Node) => {
        if (is(node, { tagName: 'html' })) {
          const element = node as Element
          const lang = metaLang ?? 'en'
          if (element.properties) {
            element.properties.lang = lang
          } else {
            element.properties = { lang }
          }
        }
      }

      interface Options {
        lang: string
      }
      const setLang = (options: Options) => (tree: Node) =>
        visit(tree, 'element', visitor)

      const processor = unified()
        .use(parse)
        .use(setLang, { lang: metaLang ?? 'en' })
        .use(stringify)
      const vfile = processor.processSync(html)
      const result = vfile.contents

      return result as string
    },
  }
}

export default indexHtmlPlugin
