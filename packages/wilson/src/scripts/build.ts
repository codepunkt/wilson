import { build as viteBuild } from 'vite'
import { emptyDir } from 'fs-extra'
import { collectPageData } from '../page'
import { getViteConfig } from '../vite'
import { prerenderStaticPages } from '../prerender'
import { createOpengraphImages } from '../opengraph'

export async function build() {
  // possible validations
  // - tsx pages don't have a default export
  // - tsx pages export Page

  await emptyDir(`${process.cwd()}/.wilson`)
  await emptyDir(`${process.cwd()}/dist`)

  await collectPageData()

  await viteBuild(await getViteConfig({ ssr: true }))
  await viteBuild(await getViteConfig({ ssr: false }))

  await prerenderStaticPages()
  await createOpengraphImages()
}
