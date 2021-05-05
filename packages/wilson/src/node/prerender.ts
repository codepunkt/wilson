import { Manifest } from 'vite'
import { wrapManifest } from './manifest'
import { readFile, toRoot, readJson, writeFile } from './util'
import { minify } from 'html-minifier-terser'
import chalk from 'chalk'
import size from 'brotli-size'
import { getConfig } from './config'
import { Dependencies } from '../types'
import { getPagefiles, getPageSources } from './state'

/**
 * @todo don't add all preload links to __WILSON_DATA__
 * instead use only those that the current page links to - this should be
 * rather easy. what also needs to be done is to update the global
 * object with additional preloadlinks when loading new page js.
 */
type PrerenderFn = (
  route: string
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

/**
 *
 */
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

/**
 *
 */
export async function prerenderStaticPages(): Promise<void> {
  try {
    console.info(
      `${chalk.yellow(
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        `wilson v${require('wilson/package.json').version}`
      )} prerendering static pages...`
    )
    const manifest = await readJson<Manifest>('./dist/manifest.json')
    const template = await readFile('./dist/index.html')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { renderToString }: { renderToString: PrerenderFn } = require(toRoot(
      './.wilson/ssr/serverRender.js'
    ))

    let longestPath = 0
    const sources: Record<string, string> = {}
    const linkDependencies: Record<string, Dependencies> = {}

    for (const [i, pageSource] of getPageSources().entries()) {
      for (const [j, page] of pageSource.pageFiles.entries()) {
        if (page.path.length > longestPath) {
          longestPath = page.path.length
        }
        const prerenderResult = await renderToString(page.route)
        const wrappedManifest = wrapManifest(manifest)
        const pageDependencies = wrappedManifest.getPageDependencies(
          `@wilson/page-source/${i}/page/${j}`
        )

        prerenderResult.links.forEach((link) => {
          if (!linkDependencies[link]) {
            for (const [i, pageSource] of getPageSources().entries()) {
              for (const [j, page] of pageSource.pageFiles.entries()) {
                if (page.route === link) {
                  linkDependencies[
                    link
                  ] = wrappedManifest.getPageDependencies(
                    `@wilson/page-source/${i}/page/${j}`,
                    { assets: false }
                  )
                }
              }
            }
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
          .map(
            (path) => `<script type=module crossorigin src=/${path}></script>`
          )

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

        sources[page.path] = source
      }
    }

    for (const pageSource of getPageSources()) {
      for (const page of pageSource.pageFiles) {
        const filteredLinkDependencies: Record<string, Dependencies> = {}
        for (const path in linkDependencies) {
          const targetPage = getPagefiles().find(
            (pageFile) => pageFile.route === path
          )
          const config = await getConfig()
          if (
            targetPage &&
            (typeof config.linkPreloadTest !== 'function' ||
              config.linkPreloadTest(targetPage.route))
          ) {
            filteredLinkDependencies[path] = linkDependencies[path]
          }
        }
        const source = sources[page.path].replace(
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

        await writeFile(toRoot(`./dist/${page.path}`), minifiedSource)
      }
    }

    console.info(`${chalk.green('✓')} ${getPagefiles().length} pages rendered.`)
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
