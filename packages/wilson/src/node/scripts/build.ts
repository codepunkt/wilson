import { build as viteBuild } from 'vite'
import fs from 'fs-extra'
import { getViteConfig } from '../vite.js'
import { prerenderStaticPages } from '../prerender.js'
import { createOpengraphImages } from '../opengraph.js'
import { createRssFeed } from '../rss.js'
import { initializePageSources } from '../state.js'

export async function build(root: string = process.cwd()): Promise<void> {
  await fs.emptyDir(`${process.cwd()}/.wilson`)
  await fs.emptyDir(`${process.cwd()}/dist`)
  await initializePageSources(`${root}/src/pages`)

  await viteBuild(await getViteConfig({ ssr: true }))
  await viteBuild(await getViteConfig({ ssr: false }))

  const feeds = await createRssFeed()
  await prerenderStaticPages(feeds)
  await createOpengraphImages()
}
