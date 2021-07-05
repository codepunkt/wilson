import { extname } from 'path'
import { normalizePath, Plugin } from 'vite'
import { TransformResult } from 'rollup'
import { toRoot } from '../util.js'
import { getPageSources } from '../state.js'

/**
 * Transform markdown to HTML to Preact components
 */
const markdownPlugin = async (): Promise<Plugin> => {
  return {
    name: 'wilson-plugin-page-markdown',
    enforce: 'pre',

    transform(code: string, id: string): TransformResult {
      if (!id.startsWith(normalizePath(toRoot('./src/pages/')))) return
      if (extname(id) !== '.md') return

      const pageSource = getPageSources().find(
        (pageSource) => pageSource.fullPath === id
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
