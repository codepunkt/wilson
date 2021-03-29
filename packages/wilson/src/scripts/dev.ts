import { createServer as createViteServer } from 'vite'
import { getConfig } from '../config'

export async function startDevServer(root: string = process.cwd()) {
  const config = getConfig(false, true)
  const devServer = await createViteServer(config)
  await devServer.listen()
}
