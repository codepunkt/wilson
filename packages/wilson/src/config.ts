// import reactRefresh from '@vitejs/plugin-react-refresh'
import { minifyHtml } from 'vite-plugin-html'
import { plugins } from './plugin'
import { UserConfig as ViteUserConfig } from 'vite'
import prefresh from '@prefresh/vite'

export function getConfig(
  ssr: boolean = false,
  dev: boolean = false
): ViteUserConfig {
  return {
    optimizeDeps: {
      include: ['preact', 'preact-iso'],
    },
    clearScreen: false,
    mode: dev ? 'development' : ssr ? 'server' : 'production',
    plugins: [
      // @TODO: check https://github.com/small-tech/vite-plugin-sri. does this tamper with splitting?
      minifyHtml({
        removeComments: false,
        useShortDoctype: true,
      }),
      ...plugins(),
      // reactRefresh(),
      prefresh({}),
    ],
    build: {
      ssr,
      outDir: ssr ? '.wilson/tmp/server' : 'dist',
      // will inline async chunk css
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
