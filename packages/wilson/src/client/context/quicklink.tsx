import { createContext, FunctionComponent } from 'preact'
import {
  StateUpdater,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'preact/hooks'
import { Dependencies } from '../../types'

declare global {
  interface Window {
    __WILSON_DATA__: { pathPreloads: Record<string, Dependencies> }
  }
}

// interface Navigator {
//   connection?: {
//     effectiveType: 'slow-2g' | '2g' | '3g' | '4g'
//     saveData: boolean
//   }
// }

type AssetState = {
  assets: string[]
  setAssets: StateUpdater<string[]>
  previousAssets: string[]
}

type HrefToDependencies = Record<string, Dependencies>

const DepsContext = createContext<null | HrefToDependencies>(null)
const AssetsContext = createContext<null | AssetState>(null)

export const QuicklinkProvider: FunctionComponent = ({ children }) => {
  const [hrefToDeps, setHrefToDeps] = useState<Record<string, Dependencies>>({})
  const [assets, setAssets] = useState<string[]>([])
  const previousAssets = usePrevious<string[]>(assets)

  useEffect(() => {
    setHrefToDeps((window.__WILSON_DATA__ ?? {}).pathPreloads)
    setAssets([
      ...new Set(
        Array.from(
          document.querySelectorAll(
            'head link[rel=stylesheet], head link[rel=preload], head link[rel=modulepreload], head script[src]'
          )
        )
          .map((e) =>
            e.getAttribute(
              e.tagName.toLowerCase() === 'script' ? 'src' : 'href'
            )
          )
          .filter((a) => a !== null) as string[]
      ),
    ])
  }, [])

  return (
    <AssetsContext.Provider value={{ assets, setAssets, previousAssets }}>
      <DepsContext.Provider value={hrefToDeps}>{children}</DepsContext.Provider>
    </AssetsContext.Provider>
  )
}

const useAssets = () => {
  const value = useContext(AssetsContext)
  return value as AssetState
}

const prefetch = (url: string): Promise<unknown> => {
  return new Promise((res, rej) => {
    const link = document.createElement('link')
    const isScript = url.endsWith('.js')
    link.rel = isScript ? 'modulepreload' : 'prefetch'
    link.as = isScript ? 'script' : 'style'
    link.crossOrigin = ''
    link.href = url
    link.onload = res
    link.onerror = rej
    document.head.appendChild(link)
  })
}

const usePrevious = <T extends unknown>(value: T): T => {
  const ref = useRef<T>()
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref.current
}

export const useQuicklink = (): void => {
  const hrefToDeps = useContext(DepsContext) as HrefToDependencies
  const { assets, previousAssets, setAssets } = useAssets()

  useEffect(() => {
    const newAssets = assets.filter((x) => previousAssets.indexOf(x) === -1)
    if (
      previousAssets !== undefined &&
      previousAssets.length &&
      newAssets.length
    ) {
      newAssets.forEach((url) => prefetch(`/${url}`))
    }
  }, [assets, previousAssets])

  useEffect(() => {
    if (hrefToDeps) {
      const getDeps = (href: string) => {
        return [
          ...(hrefToDeps[href] ?? { js: [] }).js,
          ...(hrefToDeps[href] ?? { css: [] }).css,
        ]
      }

      const observer = new window.IntersectionObserver((entries) => {
        const urlsToPrefetch = entries
          .map(({ isIntersecting, target }) =>
            isIntersecting ? getDeps(target.getAttribute('href') as string) : []
          )
          .flat()
          .filter((url) => !assets.includes(url))
        setAssets((assets) => [...new Set([...assets, ...urlsToPrefetch])])
      })

      Array.from(
        document.querySelectorAll<HTMLAnchorElement>('a:not([href^="#"])')
      )
        .filter((e) => !!e.href && e.hostname === location.hostname)
        .forEach((link) => observer.observe(link))

      return () => {
        observer.disconnect()
      }
    }
  }, [hrefToDeps, setAssets])
}
