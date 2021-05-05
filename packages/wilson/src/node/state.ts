import { basename, extname } from 'path'
import readdirp from 'readdirp'
import { getConfig } from './config'
import { pageFileTypes } from './constants'
import PageFile from './page-file'
import PageSource from './page-source'

/**
 * @TODO combine state with cache.markdown used in unified plugins
 */
interface State {
  pageSources: PageSource[]
}

const state: State = {
  pageSources: [],
}

/**
 *
 */
const initializePagesources = async (pageDir: string): Promise<void> => {
  for await (const { path, fullPath } of readdirp(pageDir)) {
    const extension = extname(basename(path))
    if (!Object.values(pageFileTypes).flat().includes(extension)) continue
    const pageSource = new PageSource(path, fullPath)
    await pageSource.initialize()
    state.pageSources.push(pageSource)
  }

  for (const pageSource of state.pageSources) {
    await pageSource.setPageFiles()
  }
}

/**
 * Returns array of all unique taxonomy terms.
 */
const getTaxonomyTerms = async (taxonomyName: string): Promise<string[]> => {
  const config = await getConfig()

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
      state.pageSources
        .filter((source) => source.frontmatter.kind === 'page')
        .map((source) => source.frontmatter.taxonomies[taxonomyName] ?? [])
        .flat()
    ),
  ]
}

/**
 *
 */
const getPageSources = (): PageSource[] => {
  return state.pageSources
}

/**
 *
 */
const getPagefiles = (): PageFile[] => {
  return state.pageSources.map((pageSource) => pageSource.pageFiles).flat()
}

export { getTaxonomyTerms, getPageSources, getPagefiles, initializePagesources }
