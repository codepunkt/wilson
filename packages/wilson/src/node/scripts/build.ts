import { build as viteBuild } from 'vite'
import fs from 'fs-extra'

import { getViteConfig } from '../vite.js'
import { prerenderStaticPages } from '../prerender.js'
import { createOpengraphImages } from '../opengraph.js'
import { createRssFeed } from '../rss.js'
import { initializePageSources } from '../state.js'
import { readFile, toRoot, writeFile } from '../util.js'

export async function build(root: string = process.cwd()): Promise<void> {
  await fs.emptyDir(`${process.cwd()}/.wilson`)
  await fs.emptyDir(`${process.cwd()}/dist`)
  await initializePageSources(`${root}/src/pages`)

  await viteBuild(await getViteConfig({ ssr: true }))

  /**
   * Alias react and react-dom to preact/compat in node_module dependencies.
   *
   * This is usually done via bundler configuration, but node_modules are not bundled
   * for server side rendering, so we need to do it manually.
   */
  const path = './.wilson/ssr/serverRender.js'
  const content = await readFile(path)
  writeFile(
    toRoot(path),
    content.replace(
      /^("use strict";)/,
      `$1\nvar ma=require('module-alias');\nvar compat='preact/compat/dist/compat.js';\nma.addAliases({react:compat,'react-dom':compat});`
    )
  )

  await viteBuild(await getViteConfig({ ssr: false }))

  const feeds = await createRssFeed()
  await prerenderStaticPages(feeds)
  await createOpengraphImages()
}
