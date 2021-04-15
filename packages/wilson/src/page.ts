import { Page } from './types'
import readdirp from 'readdirp'
import { basename, extname } from 'path'
import { pageTypes } from './plugins/pages'

interface PageFile {
  path: string
  fullPath: string
}

/**
 * Returns list of page files from page directory.
 */
export const readPageFiles = async (): Promise<PageFile[]> => {
  const pageFiles: PageFile[] = []
  const pageDir = `${process.cwd()}/src/pages`

  for await (const { path, fullPath } of readdirp(pageDir)) {
    const file = basename(path)
    const extension = extname(file)
    if (!Object.values(pageTypes).flat().includes(extension)) continue
    pageFiles.push({ path, fullPath })
  }

  return pageFiles
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

export const pages: Map<String, Page> = new Map()

export const setPage = (path: string, page: Page): void => {
  pages.set(path, page)
}
