import { relative, dirname, extname } from 'path'
import remark from 'remark'
import grayMatter from 'gray-matter'
import toHAST from 'mdast-util-to-hast'
import hastToHTML from 'hast-util-to-html'
import { Plugin } from 'vite'
import minimatch from 'minimatch'
import hastUtilRaw from 'hast-util-raw'
import {
  assetUrlPrefix,
  collectAndReplaceAssetUrls,
} from '../transformAssetUrls'
import { TransformResult } from 'rollup'
import { getOptions, OptionsWithDefaults } from '../config'
import { transformJsx } from '../util'

export interface Frontmatter {
  draft: boolean
  title: string
  ogType?: string
  [key: string]: any
}

/**
 * Defines attributes on HTML/SVG elements that should be considered when
 * converting relative URLs to imports.
 */
const assetUrlTagConfig = {
  video: ['src', 'poster'],
  source: ['src'],
  img: ['src'],
  image: ['xlink:href', 'href'],
  use: ['xlink:href', 'href'],
}

function getLayoutUrl(id: string, options: OptionsWithDefaults): string {
  const pageLayout = options.pageLayouts.find(({ pattern = '**' }) => {
    return minimatch(
      id.replace(new RegExp(`^${process.cwd()}\/src\/pages\/`), ''),
      pattern
    )
  })

  if (!pageLayout) {
    throw new Error(`Couldn't find markdown layout for: ${id}!`)
  }

  return relative(dirname(id), pageLayout.component)
}

function htmlToPreact(
  html: string,
  frontmatter: Frontmatter,
  layoutUrl: string,
  relativeAssetUrls: string[]
): string {
  // create imports from relative asset urls and replace placeholders with imported vars
  const relativeAssetImports = relativeAssetUrls.map((url, i) => {
    html = html.replace(
      new RegExp(`"${assetUrlPrefix}${i}"`, 'g'),
      `{${assetUrlPrefix}${i}}`
    )
    return `import ${assetUrlPrefix}${i} from '${url}';`
  })

  // wrap in layout component and add relative asset imports
  const fm = JSON.stringify(frontmatter)
  const template =
    `import Layout from '${layoutUrl}';` +
    `import { h } from "preact";` +
    `${relativeAssetImports.join('')}` +
    `export const Page = () => {` +
    `  return <Layout frontmatter={${fm}}>${html}</Layout>` +
    `}`

  return transformJsx(template)
}

/**
 * Transform markdown to HTML to Preact components
 */
const markdownPlugin = async (): Promise<Plugin> => {
  const options = getOptions()

  return {
    name: 'vite-plugin-wilson-markdown',
    enforce: 'pre',

    transform(code: string, id: string): TransformResult {
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

      const defaultFrontmatter = { draft: false }
      const frontmatter: Frontmatter = {
        ...defaultFrontmatter,
        ...parsedFrontmatter,
      }
      const markdown = parsed.content

      // apply plugins that change markdown or frontmatter
      const markdownAST = remark().data('settings', options).parse(markdown)
      // apply plugins that change MDAST
      const htmlAST = hastUtilRaw(
        toHAST(markdownAST, { allowDangerousHtml: true })
      )
      // apply plugins that change HAST
      const relativeAssetUrls = collectAndReplaceAssetUrls(
        htmlAST,
        assetUrlTagConfig
      )
      const html = hastToHTML(htmlAST, {
        allowDangerousHtml: true,
        closeSelfClosing: true,
      })

      return {
        code: htmlToPreact(
          html,
          frontmatter,
          getLayoutUrl(id, options),
          relativeAssetUrls
        ),
      }
    },
  }
}

export default markdownPlugin
