import { Frontmatter } from './plugins/markdown'
import { UserConfig as ViteUserConfig } from 'vite'
import prefresh from '@prefresh/vite'
import { toRoot } from './util'
import markdownPlugin from './plugins/markdown'
import virtualPlugin from './plugins/virtual'
import pagesPlugin from './plugins/pages'
import indexHtmlPlugin from './plugins/indexHtml'

/**
 * Site metadata.
 */
export interface SiteMetadata {
  siteName: string
  siteUrl: string
  titleTemplate: string
  description: string
  author: string
  /**
   * Sets document base language. Defaults to 'en'.
   */
  lang?: string
  /**
   * `twitter:site` meta. `twitter:creator` meta if `twitterCreator` is not defined.
   */
  twitterSite?: string
  /**
   * `twitter:creator` meta. `twitter:site` meta if `twitterSite` is not defined.
   */
  twitterCreator?: string
  /**
   * `keywords` meta
   */
  keywords?: string[]
}

export interface Options {
  /**
   * When defined, this iss used to generate open graph images.
   */
  opengraphImage?: {
    background: string
    texts: OpengraphImageText[]
  }
  /**
   * Mapping of layout components to glob pattern, targeting markdown documents
   */
  pageLayouts?: PageLayouts
  siteMetadata: SiteMetadata
}

export type OptionsWithDefaults = Options &
  Required<Pick<Options, 'pageLayouts' | 'opengraphImage'>>

/**
 * Represents a single text rendered onto an opengraph image.
 */
interface OpengraphImageText {
  text: (frontmatter?: Frontmatter) => string
  font: string
  fontSize?: number
  color?: string
  x?: number
  y?: number
  maxWidth?: number
  maxHeight?: number
  horizontalAlign?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'center' | 'bottom'
}

type PageLayouts = Array<{
  component: string
  pattern?: string
}>

let options: OptionsWithDefaults

export const loadOptions = async (): Promise<OptionsWithDefaults> => {
  const userConfig = require(toRoot('wilson.config.js'))

  options = {
    ...userConfig,
    pageLayouts: userConfig.pageLayouts ?? [
      {
        pattern: '**',
        component: toRoot('/src/components/MarkdownLayout'),
      },
    ],
  }

  return options as OptionsWithDefaults
}

export const getOptions = () => {
  if (!options) {
    throw new Error('run loadOptions before you use getOptions!')
  }
  return options
}

interface ViteConfigOptions {
  /**
   * Produce SSR-oriented build
   */
  ssr?: boolean
}

// @TODO: check https://github.com/small-tech/vite-plugin-sri. does this tamper with splitting?
export const getViteConfig = async ({
  ssr = false,
}: ViteConfigOptions): Promise<ViteUserConfig> => {
  return {
    optimizeDeps: {
      include: ['preact', 'preact-iso'],
    },
    clearScreen: false,
    plugins: [
      await virtualPlugin(),
      await indexHtmlPlugin(),
      await markdownPlugin(),
      await pagesPlugin(),
      prefresh({}),
    ],
    build: {
      ssr,
      outDir: ssr ? '.wilson/ssr' : 'dist',
      // inline async chunk css
      cssCodeSplit: true,
      // TODO: asset inlining doesn't work? check how vite/vitepress do it for vue
      assetsInlineLimit: 409600000,
      rollupOptions: {
        // important so that each page chunk and the index export things for each other
        preserveEntrySignatures: 'allow-extension',
        input: ssr ? 'src/entry-server.tsx' : 'index.html',
      },
      manifest: ssr ? false : true,
      minify: ssr ? false : !process.env.DEBUG,
    },
    esbuild: {
      jsxInject: `import { h, Fragment } from 'preact'`,
      jsxFactory: 'h',
      jsxFragment: 'Fragment',
    },
  }
}
