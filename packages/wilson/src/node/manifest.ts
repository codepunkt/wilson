import { extname } from 'path'
import { Manifest } from 'vite'

export const wrapManifest = (
  manifest: Manifest
): {
  getPageDependencies: typeof getPageDependencies
} => {
  const getJsDependencies = (paths: string[]): string[] => {
    return paths
      .map((path) => [manifest[path].file, ...(manifest[path].imports ?? [])])
      .flat()
  }

  const getCssDependencies = (paths: string[]): string[] => {
    return paths.map((path) => manifest[path].css ?? []).flat()
  }

  const getAssetDependencies = (paths: string[]): string[] => {
    return paths.map((path) => manifest[path].assets ?? []).flat()
  }

  const getPageDependencies = (
    pagePath: string,
    options: { assets: boolean } = { assets: true }
  ): string[] => {
    // add dependencies to sets to get rid of duplicates
    const js = new Set<string>(getJsDependencies([pagePath]))
    const css = new Set<string>(getCssDependencies([pagePath]))
    const assets = new Set<string>(getAssetDependencies([pagePath]))

    // resolve chunks without rollup facade module ids
    let length = 0
    let prevLength = 0
    do {
      prevLength = length
      const sub = Array.from(js).filter((dep) => dep.startsWith('_'))
      length = sub.length
      getJsDependencies(sub).map((j) => js.add(j))
      getCssDependencies(sub).map((c) => css.add(c))
      getAssetDependencies(sub).map((a) => assets.add(a))
    } while (length > prevLength)

    return [
      ...Array.from(js).filter(
        (dep) => !dep.startsWith('_') && extname(dep) === '.js'
      ),
      ...Array.from(css),
      ...(options.assets ? Array.from(assets) : []),
    ]
  }

  return {
    getPageDependencies,
  }
}
