import preactRenderToString from 'preact-render-to-string'
import App from './components/App'

export async function renderToString(url: string) {
  const maxDepth = 10
  let tries = 0

  // @ts-ignore
  global.location = new URL(url, 'http://localhost/')

  const vnode = <App url={url} />

  const render = async () => {
    if (++tries > maxDepth) return
    try {
      return preactRenderToString(vnode)
    } catch (e) {
      if (e && e.then) return e.then(render)
      throw e
    }
  }

  return await render()
}
