import { build as viteBuild } from 'vite'
import { getConfig } from '../config'
import { emptyDir } from 'fs-extra'
import { collectPageData } from '../collectPageData'
import { generateStaticPages } from '../generate'

export async function build() {
  await emptyDir(`${process.cwd()}/.wilson/tmp`)
  await emptyDir(`${process.cwd()}/dist`)

  await collectPageData()

  await viteBuild(getConfig(true))
  await viteBuild(getConfig(false))

  await generateStaticPages()
}
