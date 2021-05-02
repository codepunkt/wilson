import { basename, extname } from 'path'
import readdirp from 'readdirp'
import { pageTypes } from './constants'
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
    if (!Object.values(pageTypes).flat().includes(extension)) continue
    const pageSource = new PageSource(path, fullPath)
    await pageSource.initialize()
    state.pageSources.push(pageSource)
  }

  state.pageSources.forEach((pageSource) => pageSource.setPageFiles())
}

/**
 * Returns array of all unique page tags.
 */
const getTags = (): string[] => {
  return [
    ...new Set(
      state.pageSources.map((pageSource) => pageSource.frontmatter.tags).flat()
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

export { getTags, getPageSources, getPagefiles, initializePagesources }
