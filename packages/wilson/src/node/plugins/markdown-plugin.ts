import { extname } from 'path'
import { HmrContext, ModuleNode, normalizePath, Plugin } from 'vite'
import { TransformResult } from 'rollup'
import { toRoot } from '../util.js'
import { getPageSources } from '../state.js'
import { MarkdownPageSource } from '../page-source.js'

/**
 * Checks if a file is a markdown page source.
 *
 * @param filePath The path of the file to check
 * @returns A boolean value
 */
const isMarkdownPage = (filePath: string): boolean => {
  if (!filePath.startsWith(normalizePath(toRoot('./src/pages/')))) return false
  if (extname(filePath) !== '.md') return false
  return true
}

/**
 * Transform markdown to HTML to Preact components
 */
const markdownPlugin = async (): Promise<Plugin> => {
  return {
    name: 'wilson-plugin-page-markdown',
    enforce: 'pre',

    async handleHotUpdate({
      file,
      modules,
    }: HmrContext): Promise<ModuleNode[] | void> {
      // we're only interested in markdown pages here
      if (!isMarkdownPage(file)) {
        return
      }

      // find the appropriate page source
      const pageSource = getPageSources().find((s) => s.path === file)
      if (!pageSource) {
        throw new Error(`page source for HMR file ${file} not found!`)
      }

      // tell it to handle the update
      await (pageSource as MarkdownPageSource).handleHotUpdate()

      // return the modules
      return modules
    },

    transform(code: string, id: string): TransformResult {
      if (!isMarkdownPage(id)) {
        return
      }

      const pageSource = getPageSources().find(
        (pageSource) => pageSource.path === id
      )

      if (pageSource === undefined) {
        throw new Error(`couldn't find page source of ${id}!`)
      }

      if (pageSource.transformedCode === null) {
        throw new Error(`couldn't return transformed source for ${id}!`)
      }

      return {
        code: pageSource.transformedCode,
      }
    },
  }
}

export default markdownPlugin
