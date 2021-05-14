import { extname } from 'path'
import readdirp from 'readdirp'
import { getConfig } from './config'
import { pageFileTypes } from './constants'
import FrontmatterParser from './frontmatter-parser'
import Page, { ContentPage } from './page'
import {
  ContentPageSource,
  createPageSource,
  PageSourceType,
} from './page-source'

/**
 * @TODO combine state with cache.markdown used in unified plugins
 */
interface State {
  pageSources: PageSourceType[]
}

const state: State = {
  pageSources: [],
}

/**
 *
 */
const initializePagesources = async (pageDir: string): Promise<void> => {
  for await (const { path, fullPath } of readdirp(pageDir)) {
    // unknown page file extension: ignore file
    if (!Object.values(pageFileTypes).flat().includes(extname(path))) {
      continue
    }

    // parse frontmatter
    const frontmatterParser = new FrontmatterParser(path, fullPath)
    const frontmatter = frontmatterParser.parseFrontmatter()

    // create page source
    state.pageSources.push(createPageSource({ path, fullPath, frontmatter }))
  }

  // Page sources of kind `content` or `terms` always create one page, which is
  // done in `pageSource.initialize` above.
  //
  // For page sources of kind `taxonomy`, we need to have additional information
  // to calculate how many pages we create for each of the sources:
  //
  // - all taxonomies on page sources of kind `content`
  // - pagination configuration
  // - the number of `taxonomyPages` injected into the page.
  //
  // Some of that info is only accessible after all pages for sources of kind `content`
  // have been created, which is why we derive the kind `taxonomy` and kind `select`
  // pages afterwards.
  for (const pageSource of getContentPageSources()) {
    await pageSource.createPages()
  }
  for (const pageSource of getNonContentPageSources()) {
    await pageSource.createPages()
  }

  console.log(getPages())
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
}
