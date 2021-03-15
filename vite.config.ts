import { resolve } from 'path'
import { UserConfig } from 'vite'
import reactRefresh from '@vitejs/plugin-react-refresh'
import { minifyHtml } from 'vite-plugin-html'
import { markdown } from './internal/plugins/markdown'

const config: UserConfig = {
  resolve: {
    alias: [{ find: '~/', replacement: `${resolve(__dirname, 'src')}/` }],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  plugins: [
    markdown(),
    reactRefresh(),
    minifyHtml({
      removeComments: false,
      useShortDoctype: true,
    }),
  ],
  esbuild: {
    jsxInject: `import React from 'react'`,
  },
  build: {
    minify: true,
  },
}

export default config
