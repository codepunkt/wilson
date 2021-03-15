import { createFilter, FilterPattern } from '@rollup/pluginutils'
import path from 'path'
import remark from 'remark'
import grayMatter from 'gray-matter'
import toHAST from 'mdast-util-to-hast'
import hastToHTML from 'hast-util-to-html'
import { Plugin } from 'vite'

interface Options {}

export const markdown = (options: Options = {}): Plugin => {
  return {
    name: 'rollup-plugin-markdown',
    enforce: 'pre',
    transform(code: string, id: string) {
      const extension = path.extname(id)
      if (extension !== '.md') return

      const parsed = grayMatter(code, {})
      const frontmatter = { title: '', ...parsed.data }
      const markdown = parsed.content

      // apply plugins that change Markdown or Frontmatter
      const markdownAST = remark().data('settings', options).parse(markdown)

      // apply plugins that change MDAST
      const htmlAST = toHAST(markdownAST, { allowDangerousHtml: true })
      // apply plugins that change HAST
      const html = hastToHTML(htmlAST, { allowDangerousHtml: true })

      const reactCode = require('@babel/core').transformSync(
        `import React from "react";\nexport default function Post() { return <>${html}</> }`,
        { ast: false, presets: ['@babel/preset-react'] }
      ).code

      return {
        code: reactCode,
      }
    },
  }
}
