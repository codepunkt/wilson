import { Page } from './collectPageData'
import { Manifest, wrapManifest } from './manifest'
import { readFile, toRoot, readJson, writeFile } from './util'

type PrerenderFn = (
  url: string
) => Promise<{
  html: string
  links: Set<string>
}>

const filterExistingTags = (template: string) => (path: string) =>
  !template.match(new RegExp(`(href|src)=/${path}`))

export async function prerenderStaticPages() {
  try {
    const pages = await readJson<Page[]>('./.wilson/tmp/page-data.json')
    const manifest = await readJson<Manifest>('./dist/manifest.json')
    const template = await readFile('./dist/index.html')
    const prerender = require(toRoot('./.wilson/tmp/server/entry-server.js'))
      .prerender as PrerenderFn

    for (const page of pages) {
      const prerenderResult = await prerender(page.result.url)
      const wrappedManifest = wrapManifest(manifest)
      const pageDependencies = wrappedManifest.getPageDependencies(
        `src/pages/${page.source.path}`
      )

      // const linkDeps = Array.from(prerenderResult.links)
      //   .map((link) => {
      //     const page = pages.find((page) => page.result.url === link)
      //     if (!page) return false
      //     const deps = wrappedManifest.getPageDependencies(
      //       `src/pages/${page.source.path}`
      //     )
      //     return { link, deps }
      //   })
      //   .filter(Boolean)

      const styleTags = pageDependencies.css.map(
        (dependency) => `<link rel=stylesheet href=/${dependency}>`
      )
      const preloadTags = pageDependencies.js
        .filter(filterExistingTags(template))
        .map(
          (path) =>
            `<link rel=modulepreload as=script crossorigin href=/${path}></script>`
        )
      const scriptTags = pageDependencies.js
        .filter(filterExistingTags(template))
        .map((path) => `<script type=module crossorigin src=/${path}></script>`)

      const source = `${template}`
        .replace(`<!--html-->`, prerenderResult.html)
        .replace(`<!--style-tags-->`, styleTags.join(''))
        .replace(`<!--preload-tags-->`, preloadTags.join(''))
        .replace(`<!--script-tags-->`, scriptTags.join(''))

      await writeFile(toRoot(`./dist/${page.result.path}`), source)
    }
  } catch (err) {
    console.log('error', err)
  }
}
