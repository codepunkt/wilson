import path from 'path'
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
  return require('@babel/core').transformSync(code, {
    ast: false,
    presets: ['@babel/preset-react'],
  }).code
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

  return path.relative(path.dirname(id), markdownLayout.component)
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

export const wilsonPlugin = (opts: WilsonOptions = {}): Plugin => {
  const options: Required<WilsonOptions> = { ...defaultOptions, ...opts }
  return {
    name: 'rollup-plugin-wilson',
    enforce: 'pre',

    resolveId(id: string) {
      if (id.startsWith('wilson/virtual')) {
        return id
      }
      if (id === 'wilson/virt') {
        return id
      }
    },

    async load(id: string) {
      if (id === 'wilson/virt') {
        return `export const foo = 'bar';`
      }
      if (id.startsWith('wilson/virtual')) {
        const pages = JSON.parse(
          await readFile(`${process.cwd()}/.wilson/tmp/page-data.json`, 'utf-8')
        ) as Page[]
        // todo: don't allow /0
        const match = id.match(/^wilson\/pageData(\/([\d]+))?$/)
        const pageNumber = match?.[2] ? Number(match[2]) : null
        console.log({ pages })
        const markdownPages = JSON.stringify(
          (pageNumber === null
            ? pages
            : pages.slice(
                (pageNumber - 1) * options.pageSize,
                pageNumber * options.pageSize
              )
          ).filter((page) => page.type === 'markdown')
        )

        // routes added here will be available client side, but not prerendered (yet!)
        return transformJsx(
          `import { Route } from 'react-router-dom';` +
            `import React from 'react';` +
            pages
              .map(
                (page, i) =>
                  `import Page${i} from '${`${process.cwd()}/src/pages/${
                    page.path
                  }`}';`
              )
              .join('\n') +
            `const routes = <>` +
            pages
              .map(
                (page, i) =>
                  `<Route path="${page.url}" exact><Page${i} /></Route>`
              )
              .join('\n') +
            `</>;` +
            `const markdownPages = ${markdownPages};` +
            `export { markdownPages, routes }`
        )
      }
    },

    transform(code: string, id: string) {
      const extension = path.extname(id)
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
