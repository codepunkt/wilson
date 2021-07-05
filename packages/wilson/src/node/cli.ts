import chalk from 'chalk'
import boxen from 'boxen'
import minimist from 'minimist'
import { startDevServer } from './scripts/dev.js'
import { build } from './scripts/build.js'
import { serve } from './scripts/serve.js'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const argv = minimist(process.argv.slice(2))

console.info(
  boxen(
    `You are running ${chalk.cyan(
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      `wilson ${require('wilson/package.json').version}`
    )}`,
    {
      padding: 1,
      dimBorder: true,
      margin: { left: 0, right: 0, top: 1, bottom: 1 },
      borderStyle: 'round',
    }
  )
)

async function cli(command: string) {
  if (command === 'dev') {
    try {
      startDevServer()
    } catch (err) {
      console.error(chalk.red(`failed to start dev server. error:\n`), err)
      process.exit(1)
    }
  } else if (command === 'build') {
    try {
      build()
    } catch (err) {
      console.error(chalk.red(`build error:\n`), err)
      process.exit(1)
    }
  } else if (command === 'serve') {
    try {
      serve()
    } catch (err) {
      console.error(chalk.red(`failed to start server. error:\n`), err)
      process.exit(1)
    }
  } else {
    console.error(chalk.red(`unknown command "${command}".`))
    process.exit(1)
  }
}

cli(argv._[0] || 'dev').catch((e) => {
  console.error(e)
})

export default 'wat'
