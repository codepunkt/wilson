// @TODO understand and possibly copy vite-plugin-react-pages ssrData export mechanism
// @TODO understand and possibly copy vite-plugin-react-pages dataCacheCtx.Provider mechanism
import preactRenderToString from 'preact-render-to-string'
import App from '../components/app'
import { options, VNode } from 'preact'
import { toStatic } from 'hoofd/preact'

let vnodeHook: null | ((vnode: VNode) => void)

const old = options.vnode
options.vnode = (vnode) => {
  if (old) old(vnode)
  if (vnodeHook) vnodeHook(vnode)
}

interface PrerenderResult {
  html: string
  head: {
    lang: string
    title: string
    metas: { keyword: string; content: string }[]
  }
  links: Set<string>
}

export async function renderToString(url: string): Promise<PrerenderResult> {
  const maxDepth = 10
  let tries = 0

  // this is a hack that is required because preact-iso doesn't allow
  // passing a URL via props.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.location = new URL(url, 'http://localhost/')

  const vnode = <App />

  const render = async (): Promise<string> => {
    if (++tries > maxDepth) {
      throw new Error(
        'reached maximum number of nested asynchronous operations to wait for before flushing'
      )
    }
    try {
      return preactRenderToString(vnode)
    } catch (e) {
      if (e && e.then) {
        await e
        return await render()
      }
      throw e
    }
  }

  const links = new Set<string>()
  vnodeHook = ({ type, props }: VNode<{ href?: string; target?: string }>) => {
    if (
      type === 'a' &&
      props &&
      props.href &&
      !props.href.startsWith('http') &&
      !props.href.startsWith('#') &&
      (!props.target || props.target === '_self')
    ) {
      links.add(props.href)
    }
  }

  try {
    const html = await render()
    const head = toStatic() as unknown as PrerenderResult['head']
    return { links, html, head }
  } finally {
    vnodeHook = null
  }
}
