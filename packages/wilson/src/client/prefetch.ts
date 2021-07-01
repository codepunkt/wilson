import { options, VNode } from 'preact'
import { Dependencies } from '../types'

declare global {
  interface Window {
    __WILSON_DATA__: { pathPreloads: Record<string, Dependencies> }
  }
}

/**
 * Enables prefetch of relative link resources on focus and mouseOver
 * by injecting modulepreload/preload links into the <head>
 */
export const enablePrefetch = (): void => {
  const pathPreloads = (window.__WILSON_DATA__ ?? {}).pathPreloads
  const findElements = (query: string): HTMLElement[] =>
    Array.from(document.querySelectorAll(query))
  const assets: Set<string> = new Set([
    ...(findElements(
      'head link[rel=stylesheet], head link[rel=preload], head link[rel=modulepreload]'
    )
      .map((element) => element.getAttribute('href'))
      .filter(Boolean) as string[]),
    ...(findElements('head script[src]')
      .map((element) => element.getAttribute('src'))
      .filter(Boolean) as string[]),
  ])

  const vnodeHook = ({
    type,
    props,
  }: VNode<{
    href?: string
    target?: string
    onMouseOver?: (e: MouseEvent) => void
    onFocus?: (e: FocusEvent) => void
  }>) => {
    const handleInteraction = () => {
      const preloads = [
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        ...(pathPreloads[props.href!] ?? { js: [] }).js,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        ...(pathPreloads[props.href!] ?? { css: [] }).css,
      ]
      preloads.forEach((href) => {
        href = `/${href}`
        if (!assets.has(href)) {
          const tag = document.createElement('link')
          const isScript = href.endsWith('.js')
          tag.setAttribute('rel', isScript ? 'modulepreload' : 'preload')
          tag.setAttribute('as', isScript ? 'script' : 'style')
          tag.setAttribute('crossorigin', '')
          tag.setAttribute('href', href)
          document.head.appendChild(tag)
          assets.add(href)
        }
      })
    }

    // if node is relative link opened in same tab
    if (
      type === 'a' &&
      props &&
      props.href &&
      !props.href.startsWith('http') &&
      (!props.target || props.target === '_self')
    ) {
      props.onMouseOver = handleInteraction
      props.onFocus = handleInteraction
    }
  }

  const old = options.vnode
  options.vnode = (vnode) => {
    if (old) old(vnode)
    vnodeHook(vnode)
  }
}
