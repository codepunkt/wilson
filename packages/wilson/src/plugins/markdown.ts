import { extname } from 'path'
import grayMatter from 'gray-matter'
import { Plugin } from 'vite'
import { TransformResult } from 'rollup'
import { Frontmatter } from '../types'
import rehypeSlug from 'rehype-slug'
import remarkParse from 'remark-parse'
import remarkToRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import remarkStringify from 'remark-stringify'
import unified from 'unified'
import rehypeRaw from 'rehype-raw'
import remarkRelativeAssets from '../unified/remark-relative-assets'

/**
 * Defines attributes on HTML/SVG elements that should be considered when
 * converting relative URLs to imports.
 */
const assetUrlTagConfig: Record<string, string[]> = {
  video: ['src', 'poster'],
  source: ['src'],
  img: ['src'],
  image: ['xlink:href', 'href'],
  use: ['xlink:href', 'href'],
}

/**
 * Asset URL prefix
 */
const assetUrlPrefix = '_assetUrl_'

function htmlToPreact(html: string, relativeAssetUrls: string[]): string {
  // create imports from relative asset urls and replace placeholders with imported vars
  const relativeAssetImports = relativeAssetUrls.map((url, i) => {
    html = html.replace(
      new RegExp(`"${assetUrlPrefix}${i}"`, 'g'),
      `{${assetUrlPrefix}${i}}`
    )
    return `import ${assetUrlPrefix}${i} from '${url}';`
  })

  // add relative asset imports
  const template = `
    import { h, Fragment } from "preact";
    ${relativeAssetImports.join('')}
    export const Page = () => {
      return <Fragment>${html}</Fragment>;
    };
  `

  return template
}

/**
 * Transform markdown to HTML to Preact components
 */
const markdownPlugin = async (): Promise<Plugin> => {
  return {
    name: 'vite-plugin-wilson-markdown',
    enforce: 'pre',

    async transform(code: string, id: string): Promise<TransformResult> {
      const extension = extname(id)
      if (extension !== '.md') return

      const parsed = grayMatter(code, {})
      const parsedFrontmatter = parsed.data as Frontmatter

      if (Object.values(parsedFrontmatter).length === 0) {
        throw new Error('markdown has no frontmatter!')
      }
      if (parsedFrontmatter.title === undefined) {
        throw new Error(`frontmatter has no title!`)
      }

      const processor = unified()
        .use(remarkParse)
        // apply plugins that change MDAST
        .use(remarkStringify)
        .use(remarkToRehype, { allowDangerousHtml: true })
        .use(rehypeRaw)
        // apply plugins that change HAST
        .use(remarkRelativeAssets, { assetUrlPrefix, assetUrlTagConfig })
        .use(rehypeSlug)
        .use(rehypeStringify, {
          allowDangerousHtml: true,
          closeSelfClosing: true,
        })

      const vfile = await processor.process(parsed.content)
      const html = vfile.contents as string
      // @ts-ignore
      const relativeAssetUrls = vfile.data.assetUrls as string[]

      return {
        code: htmlToPreact(html, relativeAssetUrls),
      }
    },
  }
}

export default markdownPlugin
