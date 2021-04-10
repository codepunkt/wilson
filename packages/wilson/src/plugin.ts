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
} from './transformAssetUrls'
import { transformSync } from '@babel/core'
import { LoadResult, ResolveIdResult, TransformResult } from 'rollup'
// @ts-ignore
import presetPreact from 'babel-preset-preact'
import { getPageData, toRoot } from './util'
import { getOptions, Options, OptionsWithDefaults } from './config'

export interface Frontmatter {
  draft: boolean
  title: string
  [key: string]: any
}

function transformJsx(code: string): string {
  return transformSync(code, { ast: false, presets: [presetPreact] })!.code!
}

function getLayoutUrl(id: string, options: OptionsWithDefaults): string {
  const markdownLayout = options.markdownLayouts.find(({ pattern = '**' }) => {
    return minimatch(
      id.replace(new RegExp(`^${process.cwd()}\/src\/pages\/`), ''),
      pattern
    )
  })

  if (!markdownLayout) {
    throw new Error(`Couldn't find markdown layout for: ${id}!`)
  }

  return relative(dirname(id), markdownLayout.component)
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
    `export default function MarkdownPage(){return <Layout frontmatter={${fm}}>${html}</Layout>}`

  return transformJsx(template)
}

const markdownCache: { [id: string]: Frontmatter } = {}

export const supportedFileExtensions = ['.tsx', '.md']

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

/**
 * Transform markdown to HTML to Preact components
 */
const markdownPlugin = async (): Promise<Plugin> => {
  const options = await getOptions()

  return {
    name: 'vite-plugin-wilson-markdown',
    enforce: 'pre',

    transform(code: string, id: string): TransformResult {
      const extension = extname(id)
      if (extension !== '.md') return

      const parsed = grayMatter(code, {})
      const defaultFrontmatter: Frontmatter = { title: '', draft: false }
      const frontmatter: Frontmatter = { ...defaultFrontmatter, ...parsed.data }
      const markdown = parsed.content

      markdownCache[id] = frontmatter

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

const corePlugin = async (opts: Options = {}): Promise<Plugin> => {
  // const options: Required<WilsonOptions> = { ...defaultOptions, ...opts }
  return {
    name: 'vite-plugin-wilson-core',
    enforce: 'pre',

    /**
     * Resolve wilson/virtual imports
     */
    resolveId(id: string): ResolveIdResult {
      if (id.startsWith('wilson/virtual')) {
        return id
      }
    },

    /**
     * Provide content for wilson/virtual imports
     */
    async load(id: string): Promise<LoadResult> {
      if (id.startsWith('wilson/virtual')) {
        const pages = await getPageData()
        const markdownPages = JSON.stringify(
          pages.filter((page) => page.type === 'markdown')
        )

        // routes added here will be available client side, but not prerendered (yet!)
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
            .map((page, i) => `<Page${i} path="${page.result.url}" />`)
            .join(',') +
          `];` +
          `const markdownPages = ${markdownPages};` +
          `export { markdownPages, routes };`
        return transformJsx(code)
      }
    },
  }
}

export const getWilsonPlugins = async (): Promise<Plugin[]> => [
  await corePlugin(),
  await markdownPlugin(),
]
