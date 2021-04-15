import readdirp from 'readdirp'
import { readFile, writeFile } from 'fs-extra'
import { extname, basename } from 'path'
import { Frontmatter } from './plugins/markdown'
import grayMatter from 'gray-matter'
import { pageDataPath, toRoot } from './util'
import { objectSourceToObject } from './eval'
import { pageTypes } from './plugins/pages'
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
  type: keyof typeof pageTypes
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

const getPagetype = (
  pageTypes: Record<string, string[]>,
  extension: string
): string => {
  for (const type in pageTypes) {
    if (pageTypes[type].includes(extension)) {
      return type
    }
  }
  throw new Error(`pageType for extension ${extension} not found!`)
}

export async function collectPageData() {
  const pagePath = `${process.cwd()}/src/pages`

  for await (const { path, fullPath } of readdirp(pagePath)) {
    const file = basename(path)
    const extension = extname(file)
    if (!Object.values(pageTypes).flat().includes(extension)) continue

    const pageType = getPagetype(pageTypes, extension)

    const url = `/${path
      .replace(
        new RegExp(`(${Object.values(pageTypes).flat().join('|')})$`),
        ''
      )
      .toLowerCase()
      .replace(/index$/, '')}/`.replace(/\/\/$/, '/')
    const htmlPath =
      url.split('/').pop() === 'index'
        ? `${url.replace(/^\//, '')}.html`
        : `${url.replace(/^\//, '')}index.html`

    const content = await readFile(fullPath, 'utf-8')
    let frontmatter: Frontmatter

    if (pageType === 'markdown') {
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
        ...(objectSourceToObject(objSource) as Frontmatter),
      }
    }

    if (Object.values(frontmatter).length === 0)
      throw new Error(`page has no frontmatter: ${path}!`)
    if (frontmatter.title === undefined)
      throw new Error(`frontmatter has no title: ${path}!`)

    frontmatter = {
      draft: false,
      ...frontmatter,
    }

    pages.push({
      type: pageType as Page['type'],
      frontmatter,
      source: { path, absolutePath: fullPath },
      result: { url, path: htmlPath },
    })
  }

  writeFile(toRoot(pageDataPath), JSON.stringify(pages, null, 2))
}
