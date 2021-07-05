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
  prevAssets: string[]
  dependencies: Record<string, string[]>
}

const Context = createContext<null | State>(null)

/**
 * Returns an array of existing asset URLs.
 *
 * @returns Array of existing asset URLs
 */
const getExistingAssets = (): string[] => {
  const selectors = [
    'head link[rel=stylesheet]',
    'head link[rel=preload]',
    'head link[rel=modulepreload]',
    'head script[src]',
  ]
  return [
    ...new Set(
      Array.from(document.querySelectorAll(selectors.join(',')))
        .map((e) =>
          e.getAttribute(e.tagName.toLowerCase() === 'script' ? 'src' : 'href')
        )
        .filter((a) => a !== null) as string[]
    ),
  ]
}

/**
 * Provides auto-prefetch related state to component subtree of choice.
 */
export const AutoPrefetchProvider: FunctionComponent = ({ children }) => {
  const [dependencies, setDependencies] =
    useState<Record<string, string[]> | null>(null)
  const [assets, setAssets] = useState<string[]>([])
  const prevAssets = usePrevious<string[]>(assets)

  useEffect(() => {
    setAssets(getExistingAssets())
    setDependencies((window.__WILSON_DATA__ ?? {}).pathPreloads)
  }, [])

  return (
    <Context.Provider
      value={
        dependencies === null
          ? null
          : { assets, dependencies, prevAssets, setAssets }
      }
    >
      {children}
    </Context.Provider>
  )
}

/**
 * Fetches a resource using `XMLHttpRequest`.
 *
 * @param url The URL of the resource to prefetch
 * @returns A promise representing the completion of the resource loading
 */
const viaXHR = (url: string): Promise<{ status: number }> => {
  return new Promise((res, rej) => {
    const req = new XMLHttpRequest()
    req.open(`GET`, url, (req.withCredentials = true))
    req.onload = () => {
      req.status === 200
        ? res({ status: req.status })
        : rej({ status: req.status })
    }
    req.send()
  })
}

/**
 * Fetches a resource using `<link rel=prefetch>`.
 *
 * @param url The URL of the resource to prefetch
 * @returns A promise representing the completion of the resource loading
 */
const viaDOM = (url: string): Promise<Event> => {
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

/**
 * Feature tests the availability of `<link rel=prefetch>`.
 *
 * @returns A boolean value
 */
const supportsPrefetch = (): boolean => {
  const link = document.createElement('link')
  return (
    link.relList && link.relList.supports && link.relList.supports('prefetch')
  )
}

/**
 * Fetches a resource with `<link rel=prefetch>` when supported or
 * `XMLHttpRequest` otherwise.
 *
 * @param url The URL of the resource to prefetch
 * @returns A promise representing the completion of the resource loading
 */
const prefetch = (url: string) => {
  return supportsPrefetch() ? viaDOM(url) : viaXHR(url)
}

/**
 * Finds out if the user either has set a reduced data usage option
 * on the user agent or currently is on a slow connection.
 *
 * @returns A boolean indicating whether or not data saving should be performed
 */
const performDataSaving = (): boolean => {
  const conn = (navigator as Navigator).connection
  return conn !== undefined && (conn.saveData || /2g/.test(conn.effectiveType))
}

/**
 * A hook that returns the previous value of a stateful value.
 *
 * @param value The stateful value
 * @returns The previous value of the stateful value given
 */
function usePrevious<T>(value: T): T {
  const ref = useRef<T>()
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref.current as T
}

/**
 * Returns an array of new assets to prefetch.
 *
 * Assets to prefetch are identified by links that have recently
 * entered the viewport.
 *
 * @param entries An array of `IntersectionObserverEntry` objects
 * @param dependencies An object mapping link hrefs to asset dependencies
 * @param loadedAssets An array of already loaded assets
 * @returns An array of asset URLs that can be prefetched
 */
const getPrefetchAssets = (
  entries: IntersectionObserverEntry[],
  dependencies: Record<string, string[]>,
  loadedAssets: string[]
): string[] => {
  return [
    ...new Set(
      entries
        .map(({ isIntersecting, target }) =>
          isIntersecting
            ? dependencies[target.getAttribute('href') as string]
            : []
        )
        .flat()
        .map((url) => `/${url}`)
        .filter((url) => !loadedAssets.includes(url))
    ),
  ]
}

/**
 * Returns all non-anchor links in the document.
 *
 * @returns An array of `HTMLAnchorElement`
 */
const queryNonAnchorLinks = (): HTMLAnchorElement[] => {
  return Array.from(
    document.querySelectorAll<HTMLAnchorElement>('a:not([href^="#"])')
  )
}

/**
 * A polyfill for `requestIdleCallback` using `setTimeout`.
 *
 * @param callback A reference to a function that should be called in the
 *                 near future
 * @returns A number that can be used to clear the timeout
 */
const requestIdleCallbackPolyfill = (
  callback: (deadline: IdleDeadline) => unknown
) => {
  const start = Date.now()
  return setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining() {
        return Math.max(0, 50 - (Date.now() - start))
      },
    })
  }, 1) as unknown as number
}

/**
 * Allows to use auto-prefetch functionality in any given component.
 *
 * @param options Auto-prefetch options
 */
export const useAutoPrefetch = (
  options: SiteConfigWithDefaults['autoPrefetch']
): void => {
  const [toAdd, isDone] = throttle(options.maxConcurrentFetches)
  const state = useContext(Context)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (state !== null) {
      const { assets, prevAssets } = state
      if (prevAssets !== undefined && prevAssets.length) {
        const newAssets = assets.filter((x) => prevAssets.indexOf(x) === -1)
        if (newAssets.length) {
          newAssets.forEach((url) => {
            toAdd(async () => {
              await prefetch(url)
              isDone()
            })
          })
        }
      }
    }
  }, [state, toAdd, isDone])

  // before the component using auto-prefetch is unmounted, stop watching
  // targets on the existing intersection-observer.
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [])

  // if state has been initialized and there is no `IntersectionObserver` yet,
  // create one.
  // This observer starts to observe all relative non-anchor links in the
  // document when the browser is idle. Whenever one of them enters the
  // viewport, new assets to prefetch are identified and saved on the state.
  useEffect(() => {
    if (state !== null) {
      if (observerRef.current === null) {
        const { assets, dependencies, setAssets } = state

        observerRef.current = new window.IntersectionObserver((entries) => {
          if (performDataSaving()) return
          const prefetchUrls = getPrefetchAssets(entries, dependencies, assets)
          setAssets((assets) => [...assets, ...prefetchUrls])
        })

        const cb = window.requestIdleCallback || requestIdleCallbackPolyfill
        cb(
          () => {
            queryNonAnchorLinks()
              .filter((e) => !!e.href && e.hostname === location.hostname)
              .forEach((link) => observerRef.current?.observe(link))
          },
          { timeout: options.timeout }
        )
      }
    }
  }, [state, options.timeout])
}
