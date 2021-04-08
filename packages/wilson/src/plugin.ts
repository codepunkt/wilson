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
  AssetURLTagConfig,
  collectAndReplaceAssetUrls,
} from './transformAssetUrls'
import { readFile } from 'fs-extra'
import { Page } from 'src'
import { transformSync } from '@babel/core'
import { LoadResult, ResolveIdResult, TransformResult } from 'rollup'
// @ts-ignore
import presetReact from '@babel/preset-react'

export interface WilsonOptions {
  /**
   *
   */
  pageSize?: number
  /**
   * Defines attributes on HTML/SVG elements that should be considered when
   * converting relative URLs to imports.
   */
  assetUrlTagConfig?: AssetURLTagConfig
  /**
   * Mapping of layout components to glob pattern, targeting markdown documents
   */
  markdownLayouts?: Array<{
    component: string
    pattern?: string
  }>
}

export interface Frontmatter {
  draft: boolean
  title: string
  [key: string]: any
}

const defaultOptions: Required<WilsonOptions> = {
  pageSize: 3,
  assetUrlTagConfig: {
    video: ['src', 'poster'],
    source: ['src'],
    img: ['src'],
    image: ['xlink:href', 'href'],
    use: ['xlink:href', 'href'],
  },
  markdownLayouts: [
    {
      pattern: '**',
      component: `${process.cwd()}/src/components/MarkdownLayout`,
    },
  ],
}

function transformJsx(code: string): string {
  return transformSync(code, { ast: false, presets: [presetReact] })!.code!
}

function getLayoutUrl(id: string, options: Required<WilsonOptions>): string {
  const markdownLayout = options.markdownLayouts.find(({ pattern = '**' }) => {
    return minimatch(
      id.replace(new RegExp(`^${process.cwd()}\/src\/pages\/`), ''),
      pattern
    )
  })

  if (!markdownLayout) {
    throw new Error(`Couldn't find markdown layout: ${markdownLayout}!`)
  }

  return relative(dirname(id), markdownLayout.component)
}

function htmlToReact(
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
    `import React from "react";` +
    `${relativeAssetImports.join('')}` +
    `export default function MarkdownPage(){return <Layout frontmatter={${fm}}>${html}</Layout>}`

  return transformJsx(template)
}

const markdownCache: { [id: string]: Frontmatter } = {}

export const supportedFileExtensions = ['.tsx', '.md']
let isServer: boolean

/**
 * Transform markdown to HTML to React components
 */
const markdownPlugin = (opts: WilsonOptions = {}): Plugin => {
  const options: Required<WilsonOptions> = { ...defaultOptions, ...opts }

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
        options.assetUrlTagConfig
      )
      const html = hastToHTML(htmlAST, {
        allowDangerousHtml: true,
        closeSelfClosing: true,
      })

      return {
        code: htmlToReact(
          html,
          frontmatter,
          getLayoutUrl(id, options),
          relativeAssetUrls
        ),
      }
    },
  }
}

const corePlugin = (opts: WilsonOptions = {}): Plugin => {
  // const options: Required<WilsonOptions> = { ...defaultOptions, ...opts }
  return {
    name: 'vite-plugin-wilson-core',
    enforce: 'pre',

    /**
     * Find out when server side rendering
     */
    config(config, env) {
      isServer = env.mode === 'server'
      return config
    },

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
        const pages: Page[] = JSON.parse(
          await readFile(`${process.cwd()}/.wilson/tmp/page-data.json`, 'utf-8')
        )
        const markdownPages = JSON.stringify(
          pages.filter((page) => page.type === 'markdown')
        )

        // routes added here will be available client side, but not prerendered (yet!)
        const code =
          `import { Route } from 'react-router-dom';` +
          `import React from 'react';` +
          pages
            .map((page, i) => {
              return isServer
                ? `import Page${i} from '${`${process.cwd()}/src/pages/${
                    page.source.path
                  }`}';`
                : `const Page${i} = React.lazy(() => import('${`${process.cwd()}/src/pages/${
                    page.source.path
                  }`}'));`
            })
            .join('\n') +
          `const routes = [` +
          pages
            .map((page, i) => {
              return `<Route path="${page.result.url}" key="${
                page.result.url
              }" exact>${
                isServer
                  ? `<Page${i} />`
                  : `<React.Suspense fallback={<>Loading...</>}><Page${i} /></React.Suspense>`
              }</Route>`
            })
            .join(',') +
          '];' +
          `const markdownPages = ${markdownPages};` +
          `export { markdownPages, routes };`
        return transformJsx(code)
      }
    },
  }
}

export const plugins = (opts: WilsonOptions = {}): Plugin[] => [
  corePlugin(opts),
  markdownPlugin(opts),
]
