import { extname } from 'path'
import { Plugin } from 'vite'
import { TransformResult } from 'rollup'
import { toRoot } from '../util'
import { getPageSources } from '../state'

/**
 * Transform markdown to HTML to Preact components
 */
const markdownPlugin = async (): Promise<Plugin> => {
  return {
    name: 'wilson-plugin-page-markdown',
    enforce: 'pre',

    transform(code: string, id: string): TransformResult {
      if (!id.startsWith(toRoot('./src/pages/'))) return
      if (extname(id) !== '.md') return

      const pageSource = getPageSources().find(
        (pageSource) => pageSource.fullPath === id
      )

      if (pageSource === undefined) {
        throw new Error(`couldn't find page source of ${id}!`)
      }

      if (pageSource.transformedSource === null) {
        throw new Error(`couldn't return transformed source for ${id}!`)
      }

      return {
        code: pageSource.transformedSource,
      }
    },
  }
}

export default markdownPlugin
