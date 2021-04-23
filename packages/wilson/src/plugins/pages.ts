import { Plugin } from 'vite'
import { TransformResult } from 'rollup'
import { dirname, extname, relative } from 'path'
import { toRoot, transformJsx } from '../util'
import minimatch from 'minimatch'
import { resolveUserConfig } from '../config'
import { Frontmatter, Page } from '../types'
import grayMatter from 'gray-matter'
import { readFile } from 'fs-extra'
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
import { objectSourceToObject } from '../eval'
import { mapPagePathToUrl } from '../page'
import cache from '../cache'

/**
 * Allowed file extensions for pages.
 */
export const pageTypes = {
  javascript: ['.js', '.jsx'],
  typescript: ['.tsx'],
  markdown: ['.md'],
}

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
    throw new Error(`page has no frontmatter: ${id}!`)
  if (frontmatter.title === undefined)
    throw new Error(`frontmatter has no title: ${id}!`)

  return frontmatter
}

/**
 * Wrap pages into wrapper components for <head> meta etc.
 */
const pagesPlugin = async (): Promise<Plugin> => {
  return {
    name: 'wilson-plugin-pages',
    enforce: 'pre',

    async transform(code: string, id: string): Promise<TransformResult> {
      const extension = extname(id)

      if (!Object.values(pageTypes).flat().includes(extension)) return
      if (!id.startsWith(toRoot('./src/pages/'))) return

      const { pageLayouts } = await resolveUserConfig()

      const path = id.replace(new RegExp(`^${process.cwd()}/src/pages/`), '')
      const url = mapPagePathToUrl(path)
      const resultPath =
        url.split('/').pop() === 'index'
          ? `${url.replace(/^\//, '')}.html`
          : `${url.replace(/^\//, '')}index.html`

      const pageType = getPagetype(pageTypes, extension) as Page['type']
      const page: Page = {
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

      cache.pages.set(path, page)

      const pageLayout =
        page.frontmatter.layout ?? typeof pageLayouts === 'undefined'
          ? undefined
          : pageLayouts.find(({ pattern = '**' }) =>
              minimatch(
                id.replace(new RegExp(`^${process.cwd()}\/src\/pages\/`), ''),
                pattern
              )
            )?.layout

      const wrapper =
        `import { useMeta, useTitle } from "hoofd/preact";` +
        `import { siteData } from "wilson/virtual";` +
        `${
          pageLayout
            ? `import Layout from '${relative(
                dirname(id),
                toRoot(`./src/layouts/${pageLayout}`)
              )}'`
            : `import { Fragment as Layout } from 'preact'`
        };` +
        `${code}` +
        `export default function PageWrapper() {` +
        `  const pageUrl = siteData.siteUrl + '${page.result.url}';` +
        `  const title = '${page.frontmatter.title}';` +
        `  useMeta({ property: 'og:url', content: pageUrl });` +
        `  useMeta({ property: 'og:image', content: pageUrl + 'og-image.jpg' });` +
        `  useMeta({ property: 'og:image:secure_url', content: pageUrl + 'og-image.jpg' });` +
        `  useMeta({ property: 'og:title', content: title });` +
        `  useMeta({ property: 'og:type', content: '${
          page.frontmatter.ogType ?? 'website'
        }' });` +
        `  useMeta({ property: 'twitter:title', content: title });` +
        `  useTitle(title);` +
        `  return <Layout frontmatter={${JSON.stringify(
          page.frontmatter
        )}} toc={${JSON.stringify(cache.markdown.toc.get(id))}}>` +
        `    <Page />` +
        `  </Layout>;` +
        `}`

      return {
        // jsx is automatically transformed for typescript,
        // we need to do it manually for markdown pages.
        code: extension === '.md' ? transformJsx(wrapper) : wrapper,
      }
    },
  }
}

export default pagesPlugin
