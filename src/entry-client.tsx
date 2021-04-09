import { hydrate } from 'preact-iso'
import App from './components/App'
// import 'preact/debug'

hydrate(<App />, document.getElementById('root')!)
