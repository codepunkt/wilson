import readdirp from 'readdirp'
import { readFile, writeFile } from 'fs-extra'
import { extname, basename } from 'path'
import { Frontmatter, supportedFileExtensions } from './plugin'
import grayMatter from 'gray-matter'

export type Page = (
  | { type: 'markdown'; frontmatter: Frontmatter }
  | { type: 'preact'; frontmatter?: undefined }
) & {
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
    // TODO: throw out pages that don't have specific fields
    const defaultFrontmatter = { draft: false }
    const frontmatter: Frontmatter = {
      ...defaultFrontmatter,
      ...(parsed.data as Frontmatter),
    }

    const untypedPage = {
      source: {
        path,
        absolutePath: fullPath,
      },
      result: {
        url,
        path: htmlPath,
      },
    }

    pages.push(
      isMarkdown
        ? { type: 'markdown', frontmatter, ...untypedPage }
        : { type: 'preact', ...untypedPage }
    )
  }

  writeFile(
    `${process.cwd()}/.wilson/tmp/page-data.json`,
    JSON.stringify(pages, null, 2)
  )
}
