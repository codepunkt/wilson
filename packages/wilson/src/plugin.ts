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

export interface WilsonOptions {
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
    `export default function(){return <Layout frontmatter={${fm}}>${html}</Layout>}`

  // replace JSX with React.createElement calls
  return require('@babel/core').transformSync(template, {
    ast: false,
    presets: ['@babel/preset-react'],
  }).code
}

const markdownCache: { [id: string]: Frontmatter } = {}

export const wilson = (opts: WilsonOptions = {}): Plugin => {
  const options: Required<WilsonOptions> = { ...defaultOptions, ...opts }
  return {
    name: 'rollup-plugin-wilson',
    enforce: 'pre',

    // async generateBundle() {
    //   console.log('=========')
    //   console.log(markdownCache)
    //   console.log('=========')
    //     this.emitFile({
    //       type: 'asset',
    //       fileName: 'hurz',
    //       source: 'wat',
    //     })
    // },

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
