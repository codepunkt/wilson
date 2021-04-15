import { Dependencies, Manifest, wrapManifest } from './manifest'
import { readFile, toRoot, readJson, writeFile, getPageData } from './util'
import { minify } from 'html-minifier-terser'
import chalk from 'chalk'
import size from 'brotli-size'
import { resolveUserConfig } from './config'

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

const getCompressedSize = async (code: string): Promise<string> => {
  const isLarge = (code: string): boolean => code.length / 1024 > 500

  // bail out on particularly large chunks
  return isLarge(code)
    ? 'skipped (large chunk)'
    : `${(
        (await size(typeof code === 'string' ? code : Buffer.from(code))) / 1024
      ).toFixed(2)}kb`
}

const filterExistingTags = (template: string) => (path: string) =>
  !template.match(new RegExp(`(href|src)=/${path}`))

export async function prerenderStaticPages() {
  try {
    console.log(
      `${chalk.yellow(
        `wilson v${require('wilson/package.json').version}`
      )} prerendering static pages...`
    )
    const pages = await getPageData()
    const userConfig = await resolveUserConfig()
    const manifest = await readJson<Manifest>('./dist/manifest.json')
    const template = await readFile('./dist/index.html')
    const prerender = require(toRoot('./.wilson/ssr/entry-server.js'))
      .prerender as PrerenderFn

    let longestPath = 0
    const sources: Record<string, string> = {}
    const linkDependencies: Record<string, Dependencies> = {}

    for (const page of pages) {
      if (page.result.path.length > longestPath)
        longestPath = page.result.path.length

      const prerenderResult = await prerender(page.result.url)
      const wrappedManifest = wrapManifest(manifest)
      const pageDependencies = wrappedManifest.getPageDependencies(
        `src/pages/${page.source.path}`
      )

      prerenderResult.links.forEach((link) => {
        const targetPage = pages.find((page) => page.result.url === link)
        if (targetPage && !linkDependencies[link]) {
          linkDependencies[
            link
          ] = wrappedManifest.getPageDependencies(
            `src/pages/${targetPage.source.path}`,
            { assets: false }
          )
        }
      })

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
        .replace('<!--head-->', head)
        .replace('<!--html-->', prerenderResult.html)
        .replace('<!--style-tags-->', styleTags.join(''))
        .replace('<!--preload-tags-->', preloadTags.join(''))
        .replace('<!--script-tags-->', scriptTags.join(''))

      sources[page.result.path] = source
    }

    for (const page of pages) {
      const filteredLinkDependencies: Record<string, Dependencies> = {}
      for (const path in linkDependencies) {
        const targetPage = pages.find((page) => page.result.url === path)
        if (
          targetPage &&
          (typeof userConfig.linkPreloadTest !== 'function' ||
            userConfig.linkPreloadTest(targetPage))
        ) {
          filteredLinkDependencies[path] = linkDependencies[path]
        }
      }
      const source = sources[page.result.path].replace(
        '<!--wilson-data-->',
        `<script>window.__WILSON_DATA__ = {` +
          `  pathPreloads:${JSON.stringify(filteredLinkDependencies)}` +
          `};</script>`
      )

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

    console.info(`${chalk.green('✓')} ${pages.length} pages rendered.`)
    for (const page of Object.keys(sources)) {
      console.info(
        `${chalk.grey(chalk.white.dim('dist/'))}${chalk.green(
          page.padEnd(longestPath + 2)
        )} ${chalk.dim(
          `${(sources[page].length / 1024).toFixed(
            2
          )}kb / brotli: ${await getCompressedSize(sources[page])}`
        )}`
      )
    }
  } catch (err) {
    console.error('error', err)
  }
}
