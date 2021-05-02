import { UserConfig as ViteUserConfig } from 'vite'
import prefresh from '@prefresh/vite'
import markdownPlugin from './plugins/markdown'
import virtualPlugin from './plugins/virtual'
import pagesPlugin from './plugins/pages'
import indexHtmlPlugin from './plugins/indexHtml'
import { join } from 'path'

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
        'preact-iso',
        'hoofd/preact',
        '@prefresh/vite/utils',
        '@prefresh/vite/runtime',
      ],

      exclude: ['wilson/virtual'],
    },
    clearScreen: false,
    plugins: [
      await indexHtmlPlugin(),
      await markdownPlugin(),
      await pagesPlugin(),
      await virtualPlugin(),
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
        input: ssr
          ? join(__dirname, '../client/ssr/serverRender.js')
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
