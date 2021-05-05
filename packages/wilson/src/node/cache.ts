import { Heading } from '../types'

/**
 * @todo move cache to state, get rid of this!
 */
interface PluginCache {
  markdown: {
    toc: Map<string, Heading[]>
  }
}

const cache: PluginCache = {
  markdown: {
    toc: new Map(),
  },
}

export default cache
