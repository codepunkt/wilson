import { SiteData, UserConfig } from './types'
import { resolve } from 'path'
import { pathExists } from 'fs-extra'

export async function resolveUserConfig(
  root: string = process.cwd()
): Promise<UserConfig> {
  const configPath = resolve(root, 'wilson.config.js')
  const hasUserConfig = await pathExists(configPath)

  if (!hasUserConfig) {
    throw new Error(`no userconfig found.`)
  }

  // always delete cache first before loading config
  delete require.cache[configPath]

  const userConfig: UserConfig = require(configPath)
  return {
    pageLayouts: [{ pattern: '**/*.md', component: 'markdown' }],
    ...userConfig,
  }
}

export async function resolveSiteData(
  root: string = process.cwd()
): Promise<SiteData> {
  const userConfig = await resolveUserConfig(root)
  return {
    ...userConfig.siteData,
  }
}
