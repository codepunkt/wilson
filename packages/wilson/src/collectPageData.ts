// const modules = import.meta.globEager('../pages/**/*.(tsx|md)')

// const pages = Object.keys(modules).map((path) => {
//   const name = path.match(/\.\.\/pages\/(.*)\.(tsx|md)$/)![1]

//   return {
//     name,
//     path: `/${name.toLowerCase().replace(/index$/, '')}/`.replace(/\/\/$/, '/'),
//     component: modules[path].default,
//   }
// })

import readdirp from 'readdirp'
import { readFile, writeFile } from 'fs-extra'
import { extname } from 'path'
import { Frontmatter, supportedFileExtensions } from './plugin'
import grayMatter from 'gray-matter'

export interface Page {
  /**
   * relative path inside /src/pages
   */
  path: string
  /**
   * absolute path on filesystem
   */
  fullPath: string
  /**
   * basename of the file
   */
  basename: string
  url: string
  htmlPath: string
  type: 'markdown' | 'react'
  frontmatter?: Frontmatter
}

const pages: Page[] = []

export async function collectPageData() {
  const pagePath = `${process.cwd()}/src/pages`

  for await (const { path, fullPath, basename } of readdirp(pagePath)) {
    const extension = extname(basename)
    if (!supportedFileExtensions.includes(extension)) continue

    const isMarkdown = extension === '.md'
    const url = `/${path
      .replace(/\.(tsx|md)$/, '')
      .toLowerCase()
      .replace(/index$/, '')}/`.replace(/\/\/$/, '/')
    const htmlPath =
      url.split('/').pop() === 'index'
        ? `${url.replace(/^\//, '')}.html`
        : `${url.replace(/^\//, '')}index.html`
    const content = await readFile(fullPath, 'utf-8')
    const parsed = grayMatter(content, {})
    // TODO: throw out pages that are in draft on prod build
    // TODO: throw out pages that don't have specific fields (e.g. title)
    const defaultFrontmatter = { draft: false }
    const frontmatter: Frontmatter = {
      ...defaultFrontmatter,
      ...(parsed.data as Frontmatter),
    }
    pages.push({
      type: isMarkdown ? 'markdown' : 'react',
      path,
      fullPath,
      basename,
      url,
      htmlPath,
      ...(isMarkdown ? { frontmatter } : {}),
    })
  }

  writeFile(
    `${process.cwd()}/.wilson/tmp/page-data.json`,
    JSON.stringify(pages, null, 2)
  )
}
