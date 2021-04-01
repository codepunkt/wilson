import { build } from 'vite'
import { getConfig } from '../config'

import { ensureDir, emptyDir, readFile, stat, writeFile } from 'fs-extra'
import { resolve } from 'path'
import readdirp from 'readdirp'
import chalk from 'chalk'
import packageJson from '../../package.json'
import { collectPageData } from '../collectPageData'

interface Page {
  sourcePath: string
  url: string
  htmlPath: string
}

const toAbsolute = (path: string) => resolve(process.cwd(), path)

async function prerender() {
  const pages: Page[] = []

  try {
    const template = await readFile(toAbsolute('./dist/index.html'), 'utf-8')

    // collect pages
    for await (const entry of readdirp(toAbsolute('./src/pages'))) {
      const sourcePath = entry.path
      const url = `/${sourcePath
        .replace(/\.(tsx|md)$/, '')
        .toLowerCase()
        .replace(/index$/, '')}/`.replace(/\/\/$/, '/')
      const htmlPath =
        url.split('/').pop() === 'index'
          ? `${url.replace(/^\//, '')}.html`
          : `${url.replace(/^\//, '')}index.html`
      pages.push({ sourcePath, url, htmlPath })
    }

    // pre-render each page
    console.log(
      `${chalk.cyan(`wilson v${packageJson.version}`)} ${chalk.green(
        'generating static pages...'
      )}`
    )
    for (const page of pages) {
      const context = {}
      const renderFn = require(toAbsolute(
        './.wilson/tmp/server/entry-server.js'
      )).render
      const renderedHtml = await renderFn(page.url, context)
      const html = template.replace(`<!--app-html-->`, renderedHtml)
      const filePath = toAbsolute(`./dist/${page.htmlPath}`)
      await ensureDir(filePath.replace(/\/index\.html$/, ''))
      await writeFile(filePath, html)
      const size = `${((await stat(filePath)).size / 1024).toFixed(2)}kb`
      console.log(`dist/${page.htmlPath}`, size)
    }
  } catch (e) {
    console.log(e)
  }

  return pages
}

export async function generate() {
  await emptyDir(`${process.cwd()}/.wilson/tmp`)

  await collectPageData()

  const serverResult = await build(getConfig(true))
  const clientResult = await build(getConfig(false))
  const prerenderResult = await prerender()

  return [clientResult, serverResult, prerenderResult]
}
