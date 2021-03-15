import { ensureDir, readFile, writeFile } from 'fs-extra'
import { resolve } from 'path'
import readdirp from 'readdirp'

interface Page {
  sourcePath: string
  url: string
  htmlPath: string
}

const toAbsolute = (p: string) => resolve(__dirname, p)

;(async () => {
  try {
    const template = await readFile(
      toAbsolute('../dist/static/index.html'),
      'utf-8'
    )

    // collect pages
    const pages: Page[] = []
    for await (const entry of readdirp(toAbsolute('../src/pages'))) {
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
    for (const page of pages) {
      const context = {}
      const renderFn = require('../dist/server/entry-server.js').render
      const renderedHtml = await renderFn(page.url, context)
      const html = template.replace(`<!--app-html-->`, renderedHtml)
      await ensureDir(
        toAbsolute(`../dist/static/${page.htmlPath}`).replace(
          /\/index\.html$/,
          ''
        )
      )
      await writeFile(toAbsolute(`../dist/static/${page.htmlPath}`), html)
      console.log('pre-rendered:', page)
    }
  } catch (e) {
    console.log(e)
  }
})()
