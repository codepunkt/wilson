import renderToString from 'preact-render-to-string'
import { App } from './components/App'

export async function render(url: string) {
  return renderToString(<App url={url} />)
}
