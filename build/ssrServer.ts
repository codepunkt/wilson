import { readFileSync } from 'fs-extra'
import { resolve } from 'path'
import express from 'express'

const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITE_TEST_BUILD
const toAbsolute = (p: string) => resolve(__dirname, p)
const manifest = require('../dist/client/ssr-manifest.json')
const template = readFileSync(toAbsolute('../dist/client/index.html'), 'utf-8')

async function createServer() {
  const app = express()

  app.use(require('compression')())
  app.use(
    require('serve-static')(toAbsolute('../dist/client'), {
      index: false,
    })
  )
  app.use('*', async (req, res) => {
    try {
      const { render } = require('../dist/server/entry-server.js')
      const appHtml = await render(req.originalUrl, manifest)
      const html = template.replace(`<!--app-html-->`, appHtml)
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
    } catch (e) {
      console.log(e.stack)
      res.status(500).end(e.stack)
    }
  })

  return { app }
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
exports.createServer = createServer
