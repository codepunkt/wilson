import reactRefresh from '@vitejs/plugin-react-refresh'
import { minifyHtml } from 'vite-plugin-html'
import { wilson } from './plugin'
import { UserConfig as ViteUserConfig } from 'vite'

export function getConfig(
  ssr: boolean = false,
  dev: boolean = false
): ViteUserConfig {
  return {
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
    },
    clearScreen: false,
    mode: dev ? 'development' : 'production',
    plugins: [
      wilson(),
      reactRefresh(),
      minifyHtml({
        removeComments: false,
        useShortDoctype: true,
      }),
    ],
    build: {
      ssr,
      outDir: ssr ? '.wilson/tmp/server' : 'dist',
      // will inline async chunk css
      cssCodeSplit: true,
      rollupOptions: {
        // important so that each page chunk and the index export things for each other
        preserveEntrySignatures: 'allow-extension',
        input: ssr ? 'src/entry-server.tsx' : 'index.html',
      },
      minify: ssr ? false : !process.env.DEBUG,
    },
    esbuild: {
      jsxInject: `import React from 'react'`,
    },
  }
}
