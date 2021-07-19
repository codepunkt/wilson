import {
  SiteConfig,
  SiteConfigDefaults,
  SiteConfigWithDefaults,
} from '../types'
import { resolve } from 'path'
import fs from 'fs-extra'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

const configDefaults: SiteConfigDefaults = {
  pageLayouts: [{ pattern: '**/*.md', layout: 'markdown' }],
  pagination: {
    pageSize: 10,
    routeSuffix: (pageNumber: number): string =>
      pageNumber === 0 ? '' : `page-${pageNumber}`,
  },
  taxonomies: {
    categories: 'category',
    tags: 'tag',
  },
  feeds: [],
  syntaxHighlighting: {
    extensions: [],
    theme: 'Default Dark+',
  },
  autoPrefetch: {
    enabled: true,
    maxConcurrentFetches: 8,
    timeout: 2000,
  },
}

/**
 * Configuration file name.
 */
const configFileName = 'wilson.config.js'

/**
 * Cached configuration data.
 */
let cachedConfig: SiteConfigWithDefaults | null = null

/**
 * Returns user's site configuration, combined with default values.
 */
export function getConfig(
  root: string = process.cwd()
): SiteConfigWithDefaults {
  // If configuration data is cached in production, return from cache.
  if (process.env.NODE_ENV === 'production' && cachedConfig !== null) {
    return cachedConfig
  }

  // Check config file existance.
  const configPath = resolve(root, configFileName)
  const hasConfig = fs.pathExistsSync(configPath)
  if (!hasConfig) {
    throw new Error(`no ${configFileName} found.`)
  }

  // Delete cache, then load (fresh) configuration data from file.
  delete require.cache[configPath]
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const config: SiteConfig = require(configPath)

  const isDevServer =
    process.argv.length === 2 || ['start', 'dev'].includes(process.argv[2])

  // Cache and return configuration data.
  cachedConfig = {
    ...configDefaults,
    ...config,
    pagination: { ...configDefaults.pagination, ...config.pagination },
    autoPrefetch: {
      ...configDefaults.autoPrefetch,
      ...config.autoPrefetch,
      // Disable auto-prefetch in development mode
      ...(isDevServer ? { enabled: false } : {}),
    },
  }

  return cachedConfig
}
