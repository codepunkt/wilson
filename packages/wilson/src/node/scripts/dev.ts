import { createServer as createViteServer } from 'vite'
import { getViteConfig } from '../vite.js'
import fs from 'fs-extra'
import { initializePagesources } from '../state.js'
import PrettyError from 'pretty-error'

export async function startDevServer(
  root: string = process.cwd()
): Promise<void> {
  try {
    await fs.emptyDir(`${root}/.wilson`)
    await initializePagesources(`${root}/src/pages`)

    const config = await getViteConfig({ ssr: false })
    const devServer = await createViteServer(config)

    await devServer.listen()
  } catch (e) {
    // const err: Error = e
    const pe = new PrettyError()

    console.error(pe.render(e))

    //     console.error(`${chalk.red(`${err.name}: ${err.message}`)}
    // ${err.stack?.replace(new RegExp(`^${err.name}: ${err.message}`), '')}`)
  }
}
