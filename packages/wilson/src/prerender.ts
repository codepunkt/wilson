import { dirname, extname, resolve } from 'path'
import { ensureDir, readFile, writeFile } from 'fs-extra'
import { Page } from './collectPageData'

// @TODO: read types from updated vite version, PR #2901
// https://github.com/vitejs/vite/pull/2901
type Manifest = Record<string, ManifestChunk>
interface ManifestChunk {
  src?: string
  file: string
  css?: string[]
  assets?: string[]
  isEntry?: boolean
  isDynamicEntry?: boolean
  imports?: string[]
  dynamicImports?: string[]
}

interface Dependencies {
  js: string[]
  css: string[]
  assets: string[]
}

const toAbsolute = (path: string) => resolve(process.cwd(), path)
const filterExistingTags = (template: string) => (path: string) => {
  return !template.match(new RegExp(`(href|src)=/${path}`))
}

function getDependencies(manifest: Manifest, pagePath: string): Dependencies {
  // add dependencies to sets to get rid of duplicates
  const jsDependencies = new Set<string>(
    getJsDependencies(manifest, [pagePath])
  )
  const cssDependencies = new Set<string>(
    getCssDependencies(manifest, [pagePath])
  )
  const assetDependencies = new Set<string>(
    getAssetDependencies(manifest, [pagePath])
  )

  // resolve chunks without rollup facade module ids
  let length = 0
  let prevLength = 0
  do {
    prevLength = length
    const sub = Array.from(jsDependencies).filter((dep) => dep.startsWith('_'))
    length = sub.length
    getJsDependencies(manifest, sub).map((j) => jsDependencies.add(j))
    getCssDependencies(manifest, sub).map((c) => cssDependencies.add(c))
    getAssetDependencies(manifest, sub).map((a) => assetDependencies.add(a))
  } while (length > prevLength)

  return {
    js: Array.from(jsDependencies).filter(
      (dep) => !dep.startsWith('_') && extname(dep) === '.js'
    ),
    css: Array.from(cssDependencies),
    assets: Array.from(assetDependencies),
  }
}

function getJsDependencies(manifest: Manifest, paths: string[]): string[] {
  return paths
    .map((path) => [manifest[path].file, ...(manifest[path].imports ?? [])])
    .flat()
}

function getCssDependencies(manifest: Manifest, paths: string[]): string[] {
  return paths.map((path) => manifest[path].css ?? []).flat()
}

function getAssetDependencies(manifest: Manifest, paths: string[]): string[] {
  return paths.map((path) => manifest[path].assets ?? []).flat()
}

// @TODO log files similar to vite
export async function prerenderStaticPages() {
  try {
    const pages: Page[] = JSON.parse(
      await readFile(toAbsolute('./.wilson/tmp/page-data.json'), 'utf-8')
    )
    const manifest: Manifest = JSON.parse(
      await readFile(toAbsolute('./dist/manifest.json'), 'utf-8')
    )
    const template = await readFile(toAbsolute('./dist/index.html'), 'utf-8')

    for (const page of pages) {
      const deps = getDependencies(manifest, `src/pages/${page.source.path}`)
      const prerender: (
        url: string
      ) => Promise<{
        html: string
        links: Set<string>
      }> = require(toAbsolute('./.wilson/tmp/server/entry-server.js')).prerender
      const prerenderResult = await prerender(page.result.url)
      const styleTags = deps.css
        .map((path) => `<link rel=stylesheet href=/${path}>`)
        .join('')
      // const linkDeps = Array.from(prerenderResult.links)
      //   .map((link) => {
      //     const page = pages.find((page) => page.result.url === link)
      //     if (!page) return false
      //     const deps = getDependencies(
      //       manifest,
      //       `src/pages/${page.source.path}`
      //     )
      //     return { link, deps }
      //   })
      //   .filter(Boolean)
      const preloadTags = deps.js
        .filter(filterExistingTags(template))
        .map(
          (path) =>
            `<link rel=modulepreload as=script crossorigin href=/${path}></script>`
        )
        .join('')
      const scriptTags = deps.js
        .filter(filterExistingTags(template))
        .map((path) => `<script type=module crossorigin src=/${path}></script>`)
        .join('')
      const source = `${template}`
        .replace(`<!--html-->`, prerenderResult.html)
        .replace(`<!--style-tags-->`, styleTags)
        .replace(`<!--preload-tags-->`, preloadTags)
        .replace(`<!--script-tags-->`, scriptTags)

      const staticHtmlPath = toAbsolute(`./dist/${page.result.path}`)
      await ensureDir(dirname(staticHtmlPath))
      await writeFile(staticHtmlPath, source)
    }
  } catch (err) {
    console.log('error', err)
  }
}
