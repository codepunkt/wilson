import { Plugin } from 'vite'
import { LoadResult } from 'rollup'
import { readFile } from 'fs/promises'
// eslint-disable-next-line
// @ts-ignore
import svgr from '@svgr/core'
import { transformJsx } from '../util.js'

const cache = new Map()

const svgPlugin = async (): Promise<Plugin> => {
  return {
    name: 'wilson-plugin-svg',
    enforce: 'pre',

    async load(id): Promise<LoadResult> {
      if (!id.match(/\.svg\?component$/)) return

      id = id.replace(/\?component$/, '')
      let result = cache.get(id)

      if (!result) {
        const code = await readFile(id)
        const jsx = await svgr.default(code)
        result = `import { h } from 'preact';\n${transformJsx(jsx)}`
        cache.set(id, result)
      }

      return result
    },
  }
}

export default svgPlugin
