import App from './components/app'
import { hydrate } from 'preact-iso'

const app = <App />
// if (import.meta.hot) {
//     app = something else
// }

// @TODO: whats SSRContextProvider in react-plugin-pages?
hydrate(app, document.body)
