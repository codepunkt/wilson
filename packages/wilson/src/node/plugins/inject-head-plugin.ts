import { IndexHtmlTransformResult, Plugin } from 'vite'
import { getConfig } from '../config.js'

const injectHeadPlugin = async (): Promise<Plugin> => {
  return {
    name: 'wilson-plugin-inject-head',
    enforce: 'pre',

    async transformIndexHtml(html: string): Promise<IndexHtmlTransformResult> {
      const { injectHead } = getConfig()
      return html.replace('<!--head-inject-->', await injectHead())
    },
  }
}

export default injectHeadPlugin
