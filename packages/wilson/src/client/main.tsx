import App from './components/app'
import { hydrate } from 'preact-iso'
import { options, VNode } from 'preact'
import { Dependencies } from '../types'

const app = <App />
// if (import.meta.hot) {
//     app = something else
// }

// @TODO: whats SSRContextProvider in react-plugin-pages?
hydrate(app, document.body)

if (process.env.NODE_ENV === 'production') {
  // @ts-ignore
  const pathPreloads = (window.__WILSON_DATA__ ?? {}).pathPreloads as Record<
    string,
    Dependencies
  >
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
        ...(pathPreloads[props.href!] ?? { js: [] }).js,
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
