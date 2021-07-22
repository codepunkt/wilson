declare module '*.svg?component' {
  import { FunctionComponent, JSX } from 'preact'
  const src: FunctionComponent<JSX.SVGAttributes>
  export default src
}
