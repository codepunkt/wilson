import { createContext, FunctionComponent } from 'preact'
import {
  StateUpdater,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'preact/hooks'

declare global {
  interface Window {
    __WILSON_DATA__: { pathPreloads: Record<string, string[]> }
  }
}

// interface Navigator {
//   connection?: {
//     effectiveType: 'slow-2g' | '2g' | '3g' | '4g'
//     saveData: boolean
//   }
// }

type State = {
  assets: string[]
  setAssets: StateUpdater<string[]>
  previousAssets: string[]
  dependencies: Record<string, string[]>
}

const Context = createContext<null | State>(null)

export const QuicklinkProvider: FunctionComponent = ({ children }) => {
  const [dependencies, setDependencies] =
    useState<Record<string, string[]> | null>(null)
  const [assets, setAssets] = useState<string[]>([])
  const previousAssets = usePrevious<string[]>(assets)

  useEffect(() => {
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
    setDependencies((window.__WILSON_DATA__ ?? {}).pathPreloads)
  }, [])

  return (
    <Context.Provider
      value={
        dependencies === null
          ? null
          : { assets, dependencies, previousAssets, setAssets }
      }
    >
      {children}
    </Context.Provider>
  )
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
  const state = useContext(Context)

  useEffect(() => {
    if (state !== null) {
      const { assets, previousAssets } = state
      const newAssets = assets.filter((x) => previousAssets.indexOf(x) === -1)
      if (
        previousAssets !== undefined &&
        previousAssets.length &&
        newAssets.length
      ) {
        newAssets.forEach((url) => prefetch(`/${url}`))
      }
    }
  }, [state])

  useEffect(() => {
    if (state !== null) {
      const { assets, dependencies, setAssets } = state

      const observer = new window.IntersectionObserver((entries) => {
        const urlsToPrefetch = entries
          .map(({ isIntersecting, target }) =>
            isIntersecting
              ? dependencies[target.getAttribute('href') as string]
              : []
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
  }, [state])
}
