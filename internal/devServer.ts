import { readFile } from 'fs-extra'
import express from 'express'
import { resolve } from 'path'
import { StaticRouterContext } from 'react-router'

const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITE_TEST_BUILD
const toAbsolute = (p: string) => resolve(__dirname, p)

async function createServer(root = process.cwd()) {
  const app = express()
  const vite = await require('vite').createServer({
    root,
    logLevel: isTest ? 'error' : 'info',
    server: {
      middlewareMode: true,
    },
  })

  app.use(vite.middlewares)
  app.use('*', async (req, res) => {
    try {
      const url = req.originalUrl

      // 1. read index.html
      const index = await readFile(toAbsolute('../index.html'), 'utf-8')
      // 2. Apply vite HTML transforms. This injects the vite HMR client, and
      //    also applies HTML transforms from Vite plugins, e.g. global preambles
      //    from @vitejs/plugin-react-refresh
      const template = await vite.transformIndexHtml(url, index)
      // 3. Load the server entry. vite.ssrLoadModule automatically transforms
      //    your ESM source code to be usable in Node.js! There is no bundling
      //    required, and provides efficient invalidation similar to HMR.
      const { render } = await vite.ssrLoadModule('/src/entry-server.tsx')
      // 4. render the app HTML. This assumes entry-server.js's exported `render`
      //    function calls appropriate framework SSR APIs,
      //    e.g. ReacDOMServer.renderToString()
      const context: StaticRouterContext = {}
      const appHtml = render(url, context)
      // 5. Inject the app-rendered HTML into the template.
      const html = template.replace(`<!--app-html-->`, appHtml)
      // 6. Send the rendered HTML back.
      return context.url
        ? res.redirect(301, context.url)
        : res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
    } catch (e) {
      vite.ssrFixStacktrace(e)
      console.log(e.stack)
      res.status(500).end(e.stack)
    }
  })

  return { app, vite }
}

// if not testing, listen
if (!isTest) {
  createServer().then(({ app }) =>
    app.listen(3000, () => {
      console.log('http://localhost:3000')
    })
  )
}

// export for test purposes
module.exports.createServer = createServer
