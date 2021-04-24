import { Heading, Page } from './types'

interface PluginCache {
  collections: {
    all: Page[]
    [tag: string]: Page[]
  }
  markdown: {
    toc: Map<string, Heading[]>
  }
}

const cache: PluginCache = {
  collections: {
    all: [],
  },
  markdown: {
    toc: new Map(),
  },
}

export default cache
