import { basename, extname } from 'path'
import { pageTypes } from './plugins/pages'
import { Frontmatter, Page } from './types'
import grayMatter from 'gray-matter'
import { readFile } from 'fs-extra'
import { transpileModule, ModuleKind, JsxEmit } from 'typescript'
import { parse } from 'acorn'
import { walk } from 'estree-walker'
import readdirp from 'readdirp'
import {
  ObjectExpression,
  AssignmentExpression,
  MemberExpression,
  Identifier,
} from 'estree'
import { generate } from 'astring'
import { objectSourceToObject } from './eval'
import cache from './cache'

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

const getFrontmatter = async (
  id: string,
  pageType: string
): Promise<Frontmatter> => {
  const content = await readFile(id, 'utf-8')
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
    throw new Error(`page has no or empty frontmatter: ${id}!`)
  if (frontmatter.title === undefined)
    throw new Error(`frontmatter has no title: ${id}!`)

  return frontmatter
}

export const collectPageData = async (): Promise<void> => {
  const pageDir = `${process.cwd()}/src/pages`

  for await (const { path, fullPath } of readdirp(pageDir)) {
    const extension = extname(basename(path))
    if (!Object.values(pageTypes).flat().includes(extension)) continue
    await getPageData(fullPath)
  }
}

/**
 * Collects page data based on absolute path of a page.
 * Caches data so it doesn't have to be collected twice in a run.
 */
export const getPageData = async (id: string): Promise<Page> => {
  let page = cache.collections.all.find((p) => p.source.absolutePath === id)
  if (page) {
    return page
  }

  const path = id.replace(new RegExp(`^${process.cwd()}/src/pages/`), '')
  const url = mapPagePathToUrl(path)
  const resultPath =
    url.split('/').pop() === 'index'
      ? `${url.replace(/^\//, '')}.html`
      : `${url.replace(/^\//, '')}index.html`

  const extension = extname(id)
  const pageType = getPagetype(pageTypes, extension) as Page['type']
  page = {
    type: pageType,
    frontmatter: {
      draft: false,
      ...(await getFrontmatter(id, pageType)),
    },
    source: {
      path,
      absolutePath: id,
    },
    result: {
      url,
      path: resultPath,
    },
  }

  cache.collections.all.push(page)

  return page
}

/**
 * Matches all vlaid file extensions for pages.
 */
const pageExtension = new RegExp(
  `(${Object.values(pageTypes).flat().join('|')})$`
)

/**
 * Maps page path to URL
 */
export const mapPagePathToUrl = (pagePath: string): string => {
  return `/${pagePath
    .replace(pageExtension, '')
    .toLowerCase()
    .replace(/index$/, '')}/`.replace(/\/\/$/, '/')
}
