import { extname } from 'path'
import readdirp from 'readdirp'
import { getConfig } from './config.js'
import { pageFileTypes } from './constants.js'
import FrontmatterParser from './frontmatter-parser.js'
import Page, { ContentPage } from './page.js'
import {
  ContentPageSource,
  createPageSource,
  PageSourceType,
} from './page-source.js'

interface InternalState {
  pageSources: PageSourceType[]
}

/**
 * This object is used as a structured cache for various kinds
 * of internal data.
 *
 * @todo combine state with cache.markdown used in unified plugins
 */
const state: InternalState = {
  pageSources: [],
}

/**
 *
 */
const initializePagesources = async (pageDir: string): Promise<void> => {
  for await (let { path, fullPath } of readdirp(pageDir)) {
    // replace \\ with / for paths on windows
    path = path.replace(/\\/g, '/')
    fullPath = fullPath.replace(/\\/g, '/')

    // unknown page file extension: ignore file
    if (!Object.values(pageFileTypes).flat().includes(extname(path))) {
      continue
    }

    // parse frontmatter
    const frontmatterParser = new FrontmatterParser(path, fullPath)
    const frontmatter = frontmatterParser.parseFrontmatter()

    // create page source
    state.pageSources.push(await createPageSource(path, fullPath, frontmatter))
  }

  // Pages for `content` sources need to be created first, because the
  // number of pages created for `taxonomy`, `terms` and `select` sources
  // depend on them.
  for (const pageSource of getContentPageSources()) pageSource.createPages()
  for (const pageSource of getNonContentPageSources()) pageSource.createPages()
}

/**
 * Returns array of all unique taxonomy terms.
 */
const getTaxonomyTerms = (taxonomyName: string): string[] => {
  const config = getConfig()

  if (!(taxonomyName in config.taxonomies)) {
    const taxonomyNames = Object.keys(config.taxonomies)
    throw new Error(
      `Loading terms for taxonomy ${taxonomyName} failed. Available taxonomies: ${taxonomyNames.join(
        ', '
      )}`
    )
  }

  return [
    ...new Set(
      getContentPageSources()
        .map((source) => source.frontmatter.taxonomies?.[taxonomyName] ?? [])
        .flat()
    ),
  ]
}

const getPageSources = (): PageSourceType[] => {
  return state.pageSources
}

const getPages = (): Page[] => {
  return state.pageSources.map((pageSource) => pageSource.pages).flat()
}

const getContentPages = (): ContentPage[] => {
  return getPages().filter((p) => p instanceof ContentPage) as ContentPage[]
}

const getContentPageSources = (): ContentPageSource[] => {
  return getPageSources().filter(
    (s) => s instanceof ContentPageSource
  ) as ContentPageSource[]
}

const getNonContentPageSources = (): Exclude<
  PageSourceType,
  ContentPageSource
>[] => {
  return getPageSources().filter(
    (s) => !(s instanceof ContentPageSource)
  ) as Exclude<PageSourceType, ContentPageSource>[]
}

export {
  getTaxonomyTerms,
  getPageSources,
  getPages,
  initializePagesources,
  getContentPages,
  getContentPageSources,
}
