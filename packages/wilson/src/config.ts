import { minifyHtml } from 'vite-plugin-html'
import { Frontmatter } from './plugins/markdown'
import { UserConfig as ViteUserConfig } from 'vite'
import prefresh from '@prefresh/vite'
import { resolve } from 'path'
import { toRoot } from './util'
import markdownPlugin from './plugins/markdown'
import virtualPlugin from './plugins/virtual'

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
  markdownLayouts?: MarkdownLayouts
}

export type OptionsWithDefaults = Options &
  Required<Pick<Options, 'markdownLayouts' | 'opengraphImage'>>

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

type MarkdownLayouts = Array<{
  component: string
  pattern?: string
}>

let options: OptionsWithDefaults | null = null
export const getOptions = async (): Promise<OptionsWithDefaults> => {
  if (!options) {
    // const userConfig = (await import(toRoot('./wilson.config.js'))) as Options

    const configRoot = process.cwd()
    // @ts-ignore
    const configUrl = resolve(configRoot, 'wilson.config.js')
    // using eval to avoid this from being compiled away by TS/Rollup
    // append a query so that we force reload fresh config in case of
    // server restart
    const userConfig = (await eval(`import(configUrl + '?t=${Date.now()}')`))
      .default

    options = {
      ...userConfig,
      markdownLayouts: userConfig.markdownLayouts ?? [
        {
          pattern: '**',
          component: toRoot('/src/components/MarkdownLayout'),
        },
      ],
    }
  }

  return options as OptionsWithDefaults
}

interface ViteConfigOptions {
  /**
   * Produce SSR-oriented build
   */
  ssr?: boolean
}

export const getViteConfig = async ({
  ssr = false,
}: ViteConfigOptions): Promise<ViteUserConfig> => {
  return {
    optimizeDeps: {
      include: ['preact', 'preact-iso'],
    },
    clearScreen: false,
    plugins: [
      // @TODO: check https://github.com/small-tech/vite-plugin-sri. does this tamper with splitting?
      minifyHtml({
        removeComments: false,
        useShortDoctype: true,
      }),
      await virtualPlugin(),
      await markdownPlugin(),
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
