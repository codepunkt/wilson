import { createContext, FunctionComponent } from 'preact'
import {
  StateUpdater,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'preact/hooks'
import throttle from 'throttles'
import { SiteConfigWithDefaults } from '../../types'

declare global {
  interface Window {
    __WILSON_DATA__: { pathPreloads: Record<string, string[]> }
  }
}

interface Navigator {
  connection?: {
    effectiveType: 'slow-2g' | '2g' | '3g' | '4g'
    saveData: boolean
  }
}

type State = {
  assets: string[]
  setAssets: StateUpdater<string[]>
  previousAssets: string[]
  dependencies: Record<string, string[]>
}

const Context = createContext<null | State>(null)

const selectors = [
  'head link[rel=stylesheet]',
  'head link[rel=preload]',
  'head link[rel=modulepreload]',
  'head script[src]',
]

export const AutoPrefetchProvider: FunctionComponent = ({ children }) => {
  const [dependencies, setDependencies] =
    useState<Record<string, string[]> | null>(null)
  const [assets, setAssets] = useState<string[]>([])
  const previousAssets = usePrevious<string[]>(assets)

  useEffect(() => {
    setAssets([
      ...new Set(
        Array.from(document.querySelectorAll(selectors.join(',')))
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

/**
 * Fetches a given URL using XMLHttpRequest
 */
const viaXHR = (url: string): Promise<unknown> => {
  return new Promise((res, rej) => {
    const req = new XMLHttpRequest()
    req.open(`GET`, url, (req.withCredentials = true))
    req.onload = () => {
      req.status === 200 ? res(req.status) : rej(req.status)
    }
    req.send()
  })
}

/**
 * Fetches a given URL using `<link rel=modulepreload>` or `<link rel=prefetch>`
 */
const viaDOM = (url: string): Promise<unknown> => {
  return new Promise((res, rej) => {
    const link = document.createElement('link')
    const isScript = url.endsWith('.js')
    link.rel = 'prefetch' // isScript ? 'modulepreload' : 'prefetch'
    link.as = isScript ? 'script' : 'style'
    link.crossOrigin = ''
    link.href = url
    link.onload = res
    link.onerror = rej
    document.head.appendChild(link)
  })
}

const prefetch = (url: string) => {
  const link = document.createElement('link')
  const hasPrefetch =
    link.relList && link.relList.supports && link.relList.supports('prefetch')
  return hasPrefetch ? viaDOM(url) : viaXHR(url)
}

function usePrevious<T>(value: T): T {
  const ref = useRef<T>()
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref.current as T
}

export const useAutoPrefetch = (
  options: SiteConfigWithDefaults['autoPrefetch']
): void => {
  const [toAdd, isDone] = throttle(options.maxConcurrentFetches)
  const state = useContext(Context)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (state !== null) {
      const { assets, previousAssets } = state
      const newAssets = assets.filter((x) => previousAssets.indexOf(x) === -1)

      if (
        previousAssets !== undefined &&
        previousAssets.length &&
        newAssets.length
      ) {
        newAssets.forEach((url) => {
          toAdd(async () => {
            await prefetch(url)
            isDone()
          })
        })
      }
    }
  }, [state, toAdd, isDone])

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        // observerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (state !== null) {
      const { assets, dependencies, setAssets } = state

      if (observerRef.current === null) {
        const requestIdleCallback =
          window.requestIdleCallback ||
          function (cb: (deadline: IdleDeadline) => unknown) {
            const start = Date.now()
            return setTimeout(() => {
              cb({
                didTimeout: false,
                timeRemaining() {
                  return Math.max(0, 50 - (Date.now() - start))
                },
              })
            }, 1) as unknown as number
          }

        observerRef.current = new window.IntersectionObserver((entries) => {
          // Don't prefetch if using 2G or if saveData is enabled
          const conn = (navigator as Navigator).connection
          if (conn && (conn.saveData || /2g/.test(conn.effectiveType))) {
            return
          }

          const urlsToPrefetch = [
            ...new Set(
              entries
                .map(({ isIntersecting, target }) =>
                  isIntersecting
                    ? dependencies[target.getAttribute('href') as string]
                    : []
                )
                .flat()
                .map((url) => `/${url}`)
                .filter((url) => !assets.includes(url))
            ),
          ]

          setAssets((assets) => [...assets, ...urlsToPrefetch])
        })

        const { current: currentObserver } = observerRef

        requestIdleCallback(
          () => {
            Array.from(
              document.querySelectorAll<HTMLAnchorElement>('a:not([href^="#"])')
            )
              .filter((e) => !!e.href && e.hostname === location.hostname)
              .forEach((link) => currentObserver.observe(link))
          },
          {
            timeout: options.timeout,
          }
        )
      }
    }
  }, [state, options.timeout])
}
