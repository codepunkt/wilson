import { hydrate } from 'preact-iso'
// import { options, VNode } from 'preact'
import App from './components/App'
// import 'preact/debug'

// if (process.env.NODE_ENV === 'production') {
//   // @TODO: import this from wilson/virtual
//   const linkToPreloads: Record<string, string[]> = {
//     '/about/': ['/assets/about.99a69c3d.js'],
//     '/writing/': ['/assets/writing.50385de9.js'],
//   }

//   const insertedPreloads: Set<string> = new Set()

//   const vnodeHook = ({
//     type,
//     props,
//   }: VNode<{
//     href?: string
//     target?: string
//     onMouseOver?: (e: MouseEvent) => void
//   }>) => {
//     if (
//       type === 'a' &&
//       props &&
//       props.href &&
//       !props.href.startsWith('http') &&
//       (!props.target || props.target === '_self')
//     ) {
//       props.onMouseOver = (e) => {
//         const preloads = linkToPreloads[props.href!] ?? []
//         preloads.forEach((href) => {
//           if (!insertedPreloads.has(href)) {
//             const tag = document.createElement('link')
//             tag.setAttribute('rel', 'modulepreload')
//             tag.setAttribute('as', 'script')
//             tag.setAttribute('crossorigin', '')
//             tag.setAttribute('href', href)
//             document.head.appendChild(tag)
//             insertedPreloads.add(href)
//           }
//         })
//       }
//     }
//   }

//   const old = options.vnode
//   options.vnode = (vnode) => {
//     if (old) old(vnode)
//     vnodeHook(vnode)
//   }
// }

hydrate(<App />, document.body)
