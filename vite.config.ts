import { resolve } from 'path'
import { UserConfig } from 'vite'
import reactRefresh from '@vitejs/plugin-react-refresh'
import minifyHTML from './plugins/minifyHtml'

const config: UserConfig = {
  resolve: {
    alias: [{ find: '~/', replacement: `${resolve(__dirname, 'src')}/` }],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  plugins: [reactRefresh(), minifyHTML()],
  esbuild: {
    jsxInject: `import React from 'react'`,
  },
  build: {
    minify: true,
  },
}

export default config
