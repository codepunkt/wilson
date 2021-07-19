import App from './components/app'
import { hydrate } from 'preact-iso'
import { options, VNode } from 'preact'

const app = <App />
// if (import.meta.hot) {
//     app = something else
// }

// @TODO: whats SSRContextProvider in react-plugin-pages?
const old = options.vnode
options.vnode = (vnode: VNode) => {
  if (old) old(vnode)
  if (vnodeHook) vnodeHook(vnode)
}

const vnodeHook = ({
  type,
  props,
}: VNode<{ href?: string; target?: string }>) => {
  if (
    type === 'a' &&
    props &&
    props.href &&
    !props.href.startsWith('http') &&
    !props.href.startsWith('#') &&
    (!props.target || props.target === '_self')
  ) {
    if (!props.href.includes('#') && !props.href.endsWith('/')) {
      console.error(
        '%s%c%s%c%s',
        'Warning: "href" attributes of relative links should end with a trailing slash. Please fix ',
        'color:maroon;',
        `<a href="${props.href}">${props.children}</a>. `,
        'color:inherit;',
        'See https://wilsonjs.com/docs/faq#trailing-slashes for more information.'
      )
    }
  }
}

hydrate(app, document.body)
