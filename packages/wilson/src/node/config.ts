import {
  SiteConfig,
  SiteConfigDefaults,
  SiteConfigWithDefaults,
} from '../types'
import { resolve } from 'path'
import { pathExists } from 'fs-extra'

const configDefaults: SiteConfigDefaults = {
  pageLayouts: [{ pattern: '**/*.md', layout: 'markdown' }],
  taxonomies: {
    categories: 'category',
    tags: 'tag',
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
export async function getConfig(
  root: string = process.cwd()
): Promise<SiteConfigWithDefaults> {
  // If configuration data is cached in production, return from cache.
  if (process.env.NODE_ENV === 'production' && cachedConfig !== null) {
    return cachedConfig
  }

  // Check config file existance.
  const configPath = resolve(root, configFileName)
  const hasConfig = await pathExists(configPath)
  if (!hasConfig) {
    throw new Error(`no ${configFileName} found.`)
  }

  // Delete cache, then load (fresh) configuration data from file.
  delete require.cache[configPath]
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const config: SiteConfig = require(configPath)

  // Cache and return configuration data.
  cachedConfig = { ...configDefaults, ...config }
  return cachedConfig
}
