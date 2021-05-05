import express from 'express'
import os from 'os'
import chalk from 'chalk'
import compression from 'compression'

export function serve(port = 5000): void {
  const server = express()
  server.disable('x-powered-by')
  server.use(compression())
  server.use(express.static(`${process.cwd()}/dist`))
  server.listen(port, () => {
    console.info(chalk.green(`  Serving production build at:\n`))
    const interfaces = os.networkInterfaces()
    Object.keys(interfaces).forEach((key) =>
      (interfaces[key] || [])
        .filter((details) => details.family === 'IPv4')
        .map((detail) => {
          return {
            type: detail.address.includes('127.0.0.1')
              ? 'Local:   '
              : 'Network: ',
            host: detail.address.replace('127.0.0.1', 'localhost'),
          }
        })
        .forEach(({ type, host }) => {
          const url = `http://${host}:${chalk.bold(port)}`
          console.info(`  > ${type} ${chalk.cyan(url)}`)
        })
    )
  })
}
