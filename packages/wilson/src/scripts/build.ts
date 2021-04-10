import { build as viteBuild } from 'vite'
import { getViteConfig } from '../config'
import { emptyDir } from 'fs-extra'
import { collectPageData } from '../collectPageData'
import { prerenderStaticPages } from '../prerender'
import { createOpengraphImages } from '../opengraph'

export async function build() {
  await emptyDir(`${process.cwd()}/.wilson/tmp`)
  await emptyDir(`${process.cwd()}/dist`)

  await collectPageData()

  await viteBuild(await getViteConfig({ ssr: true }))
  await viteBuild(await getViteConfig({ ssr: false }))

  await prerenderStaticPages()
  await createOpengraphImages()
}
