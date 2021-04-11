import { dirname, join } from 'path'
import { readFile as read, writeFile as write, ensureDir } from 'fs-extra'
import { Page } from './collectPageData'
import { transformSync } from '@babel/core'
// @ts-ignore
import presetPreact from 'babel-preset-preact'

/**
 * Prefixes a relative path with the project root directory, turning it into
 * an absolute path.
 */
export const toRoot = (path: string) => join(process.cwd(), path)

/**
 * Reads the contents of a file relative to the project root directory as an
 * UTF-8 string.
 */
export const readFile = async (path: string) =>
  await read(toRoot(path), 'utf-8')

/**
 * Parses the contents of a json file relative to the project root directory
 * as an object or array.
 */
export const readJson = async <T extends object>(path: string): Promise<T> =>
  JSON.parse(await readFile(path))

let pageData: Page[] | null = null

/**
 * Path where page-data is stored
 */
export const pageDataPath = './.wilson/page-data.json'

/**
 * Returns page data
 */
export const getPageData = async (): Promise<Page[]> => {
  if (pageData === null) {
    pageData = await readJson<Page[]>(pageDataPath)
  }
  return pageData
}

/**
 * Write a file to the given path and ensure that any required directories
 * are created.
 */
export const writeFile = async (path: string, content: string) => {
  await ensureDir(dirname(path))
  return await write(path, content)
}

/**
 * Converts a 6-digit hex string to an RGB array.
 */
export const hexToRgb = (hex: string): [r: number, g: number, b: number] => {
  const hexCode = hex.replace(/^#/, '')
  const bigint = parseInt(hexCode, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return [r, g, b]
}

/**
 * Transforms JSX to standard JavaScript using babel.
 */
export const transformJsx = (code: string): string => {
  return transformSync(code, { ast: false, presets: [presetPreact] })!.code!
}
