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
      ],
      exclude: ['wilson/virtual'],
    },
    clearScreen: false,
    plugins: [
      await indexHtmlPlugin(),
      await markdownPlugin(),
      await pagesPlugin(),
      await virtualPlugin(),
      preact({
        devtoolsInProd: true,
      }),
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
      jsxInject: `import { h, Fragment } from 'preact'`,
      jsxFactory: 'h',
      jsxFragment: 'Fragment',
    },
  }
}
