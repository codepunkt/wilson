import { Manifest, wrapManifest } from './manifest'
import { readFile, toRoot, readJson, writeFile, getPageData } from './util'
import { minify } from 'html-minifier-terser'

type PrerenderFn = (
  url: string
) => Promise<{
  html: string
  head: {
    lang: string
    title: string
    metas: Array<
      { content: string } & (
        | { name: string; property: undefined }
        | { name: undefined; property: string }
      )
    >
  }
  links: Set<string>
}>

const filterExistingTags = (template: string) => (path: string) =>
  !template.match(new RegExp(`(href|src)=/${path}`))

export async function prerenderStaticPages() {
  try {
    const pages = await getPageData()
    const manifest = await readJson<Manifest>('./dist/manifest.json')
    const template = await readFile('./dist/index.html')
    const prerender = require(toRoot('./.wilson/ssr/entry-server.js'))
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

      const head = `
        <title>${prerenderResult.head.title}</title>
        ${prerenderResult.head.metas
          .map(
            ({ name, property, content }) =>
              `<meta ${
                name ? `name="${name}"` : `property="${property}"`
              } content="${content}">`
          )
          .join('')}
      `
      const source = `${template}`
        .replace(`<!--head-->`, head)
        .replace(`<!--html-->`, prerenderResult.html)
        .replace(`<!--style-tags-->`, styleTags.join(''))
        .replace(`<!--preload-tags-->`, preloadTags.join(''))
        .replace(`<!--script-tags-->`, scriptTags.join(''))

      const minifiedSource = minify(source, {
        collapseBooleanAttributes: true,
        collapseWhitespace: true,
        minifyCSS: true,
        minifyJS: true,
        minifyURLs: true,
        removeAttributeQuotes: true,
        removeComments: true,
        removeEmptyAttributes: true,
        useShortDoctype: true,
      })

      await writeFile(toRoot(`./dist/${page.result.path}`), minifiedSource)
    }
  } catch (err) {
    console.log('error', err)
  }
}
