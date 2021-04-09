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
    // console.dir({ pages, manifest, template }, { depth: Infinity })

    for (const page of pages) {
      const sourcePath = `src/pages/${page.source.path}`
      const deps = getDependencies(manifest, sourcePath)
      const renderFn = require(toAbsolute(
        './.wilson/tmp/server/entry-server.js'
      )).renderToString
      const appHtml = await renderFn(page.result.url)
      console.log({ appHtml })
      const scriptTags = deps.js
        .filter((path) => !template.match(new RegExp(`(href|src)=/${path}`)))
        .map((path) => `<script type=module crossorigin src=/${path}></script>`)
        .join('')
      const styleTags = deps.css
        .map((path) => `<link rel=stylesheet href=/${path}>`)
        .join('')
      const source = `${template}`
        .replace(`<!--app-html-->`, appHtml)
        .replace(`<!--script-tags-->`, scriptTags)
        .replace(`<!--style-tags-->`, styleTags)

      // @TODO how does vitepress insert the tags? what is "link tags" for?
      //    @loadable/component examples have
      //    - <link rel=stylesheet> before </head>
      //    - <link rel=preload as=script> before that
      //    - <script async> before </body>
      // @TODO implement waitFor before hydrating

      const staticHtmlPath = toAbsolute(`./dist/${page.result.path}`)
      await ensureDir(dirname(staticHtmlPath))
      await writeFile(staticHtmlPath, source)
    }
  } catch (err) {
    console.log('error', err)
  }
}
