import readdirp from 'readdirp'
import { readFile, writeFile } from 'fs-extra'
import { extname, basename } from 'path'
import { Frontmatter } from './plugins/markdown'
import grayMatter from 'gray-matter'
import { pageDataPath, toRoot } from './util'
import { pageExtensions } from './plugins/pages'
import { transpileModule, ModuleKind, JsxEmit } from 'typescript'
import { parse } from 'acorn'
import { walk } from 'estree-walker'
import {
  ObjectExpression,
  AssignmentExpression,
  MemberExpression,
  Identifier,
} from 'estree'
import { generate } from 'astring'

export interface Page {
  type: 'markdown' | 'preact'
  frontmatter: Frontmatter
  source: {
    path: string
    absolutePath: string
  }
  result: {
    path: string
    url: string
  }
}

const pages: Page[] = []

export async function collectPageData() {
  const pagePath = `${process.cwd()}/src/pages`

  for await (const { path, fullPath } of readdirp(pagePath)) {
    const file = basename(path)
    const extension = extname(file)
    if (!pageExtensions.includes(extension)) continue

    const isMarkdown = extension === '.md'

    const url = `/${path
      .replace(/\.(tsx|md)$/, '')
      .toLowerCase()
      .replace(/index$/, '')}/`.replace(/\/\/$/, '/')
    const htmlPath =
      url.split('/').pop() === 'index'
        ? `${url.replace(/^\//, '')}.html`
        : `${url.replace(/^\//, '')}index.html`

    const defaultFrontmatter = { draft: false }
    const content = await readFile(fullPath, 'utf-8')
    let frontmatter: Frontmatter

    if (isMarkdown) {
      const parsed = grayMatter(content, {})
      frontmatter = parsed.data as Frontmatter
    } else {
      const js = transpileModule(content, {
        compilerOptions: {
          module: ModuleKind.CommonJS,
          jsx: JsxEmit.ReactJSX,
          jsxImportSource: 'preact',
        },
      }).outputText
      const ast = parse(js, { ecmaVersion: 'latest' })
      let frontmatterNode: ObjectExpression | null = null
      walk(ast, {
        enter(node) {
          if (node.type !== 'AssignmentExpression') return
          const ae = node as AssignmentExpression
          if (
            ae.operator !== '=' ||
            ae.left.type !== 'MemberExpression' ||
            ae.right.type !== 'ObjectExpression'
          )
            return
          const me = ae.left as MemberExpression
          if (
            me.object.type !== 'Identifier' ||
            me.property.type !== 'Identifier' ||
            (me.object as Identifier).name !== 'exports' ||
            (me.property as Identifier).name !== 'frontmatter'
          )
            return
          frontmatterNode = ae.right as ObjectExpression
        },
      })
      const objSource = frontmatterNode
        ? generate(frontmatterNode, { indent: '', lineEnd: '' })
        : '{}'
      frontmatter = {
        ...(eval(`const obj=()=>(${objSource});obj`)() as Frontmatter),
      }
    }

    if (Object.values(frontmatter).length === 0)
      throw new Error(`page has no frontmatter: ${path}!`)
    if (frontmatter.title === undefined)
      throw new Error(`frontmatter has no title: ${path}!`)

    frontmatter = {
      ...defaultFrontmatter,
      ...frontmatter,
    }

    pages.push({
      type: isMarkdown ? 'markdown' : 'preact',
      frontmatter,
      source: { path, absolutePath: fullPath },
      result: { url, path: htmlPath },
    })
  }

  writeFile(toRoot(pageDataPath), JSON.stringify(pages, null, 2))
}
