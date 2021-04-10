import { minifyHtml } from 'vite-plugin-html'
import { Frontmatter, getWilsonPlugins } from './plugin'
import { UserConfig as ViteUserConfig } from 'vite'
import prefresh from '@prefresh/vite'
import { readFile, toRoot } from './util'

export interface Options {
  /**
   * When defined, this is used to generate open graph images.
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
  Required<Pick<Options, 'markdownLayouts'>>

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

export const getOptions = async (): Promise<OptionsWithDefaults> => {
  const userConfig = (await readFile('./.wilson/wilson.config.ts')) as Options

  return {
    ...userConfig,
    markdownLayouts: userConfig.markdownLayouts ?? [
      {
        pattern: '**',
        component: toRoot('/src/components/MarkdownLayout'),
      },
    ],
  }
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
      ...(await getWilsonPlugins()),
      prefresh({}),
    ],
    build: {
      ssr,
      outDir: ssr ? '.wilson/tmp/server' : 'dist',
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
