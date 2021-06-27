import { build as viteBuild } from 'vite'
import { emptyDir } from 'fs-extra'
import { getViteConfig } from '../vite'
import { prerenderStaticPages } from '../prerender'
import { createOpengraphImages } from '../opengraph'
import { createRssFeed } from '../rss'
import { initializePagesources } from '../state'

export async function build(root: string = process.cwd()): Promise<void> {
  await emptyDir(`${process.cwd()}/.wilson`)
  await emptyDir(`${process.cwd()}/dist`)
  await initializePagesources(`${root}/src/pages`)

  await viteBuild(await getViteConfig({ ssr: true }))
  await viteBuild(await getViteConfig({ ssr: false }))

  const feeds = await createRssFeed()
  await prerenderStaticPages(feeds)
  await createOpengraphImages()
}
