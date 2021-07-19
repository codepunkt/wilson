import { UserConfig as ViteUserConfig } from 'vite'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import preact from '@preact/preset-vite'

import markdownPlugin from './plugins/markdown-plugin.js'
import virtualPlugin from './plugins/virtual-plugin.js'
import pagesPlugin from './plugins/pages-plugin.js'
import indexHtmlPlugin from './plugins/index-html-plugin.js'

interface ViteConfigOptions {
  ssr?: boolean
}

// @TODO: check https://github.com/small-tech/vite-plugin-sri. does this tamper with splitting?
export const getViteConfig = async ({
  ssr = false,
}: ViteConfigOptions): Promise<ViteUserConfig> => {
  return {
    optimizeDeps: {
      include: [
        'preact',
        'preact/hooks',
        'preact/jsx-runtime',
        'preact-iso',
        'hoofd/preact',
        'throttles',
      ],
      exclude: ['wilson/virtual'],
    },
    clearScreen: false,
    plugins: [
      await indexHtmlPlugin(),
      await markdownPlugin(),
      await pagesPlugin(),
      await virtualPlugin(),
      // eslint-disable-next-line
      // @ts-ignore
      preact.default({
        devtoolsInProd: true,
      }),
      // vite preact plugin automatically imports { h, Fragment } from 'preact'
      // when we want to use Fragment in a layout or page, we need to import it
      // so that typescript doesn't bark at us. If we do so, the import is duplicated
      // in the generated code. Therefore, we override the preact plugin's jsxInject
      // via a vite config hook
      // @see https://github.com/preactjs/preset-vite/issues/4#issuecomment-843551844
      {
        name: 'reset-preact-plugin-esbuild-settings',
        config() {
          return {
            esbuild: {
              jsxInject: `import { h } from 'preact'`,
            },
          }
        },
      },
    ],
    build: {
      ssr,
      outDir: ssr ? '.wilson/ssr' : 'dist',
      // inline async chunk css
      cssCodeSplit: true,
      assetsInlineLimit: 4096,
      rollupOptions: {
        // important so that each page chunk and the index export things for each other
        preserveEntrySignatures: 'allow-extension',
        input: ssr
          ? join(
              dirname(fileURLToPath(import.meta.url)),
              '../client/ssr/serverRender.js'
            )
          : 'index.html',
      },
      manifest: !ssr,
      minify: ssr ? false : !process.env.DEBUG,
    },
    esbuild: {
      jsxInject: `import { h } from 'preact'`,
      jsxFactory: 'h',
      jsxFragment: 'Fragment',
    },
  }
}
