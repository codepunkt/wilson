import { dirname, join } from 'path'
import { readFile as fsRead, writeFile as write, ensureDir } from 'fs-extra'
import { transform } from 'sucrase'
import slugify from 'slugify'

/**
 * Checks if two arrays have one or more common elements.
 */
export const hasCommonElements = (arr1: string[], arr2: string[]): boolean => {
  return arr1.some((item) => arr2.includes(item))
}

/**
 * Prefixes a relative path with the project root directory, turning it into
 * an absolute path.
 */
export const toRoot = (path: string): string => join(process.cwd(), path)

/**
 * Reads the contents of a file relative to the project root directory as an
 * UTF-8 string.
 */
export const readFile = async (path: string): Promise<string> =>
  await fsRead(toRoot(path), 'utf-8')

/**
 * Parses the contents of a json file relative to the project root directory
 * as an object or array.
 */
export const readJson = async <T extends Record<string, unknown>>(
  path: string
): Promise<T> => JSON.parse(await readFile(path))

/**
 * Write a file to the given path and ensure that any required directories
 * are created.
 */
export const writeFile = async (
  path: string,
  content: string
): Promise<void> => {
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
 * Cleans URL by removing duplicate slashes.
 *
 * @param url URL to clean
 * @returns Cleaned URL
 */
export const cleanUrl = (url: string): string => {
  return url.replace(/([^:])(\/\/+)/g, '$1/')
}

/**
 * Transforms TypeScript/JSX to standard JavaScript.
 */
export const transformJsx = (code: string): string => {
  return transform(code, {
    transforms: ['jsx', 'typescript'],
    production: true,
    jsxPragma: 'h',
    jsxFragmentPragma: 'Fragment',
  }).code
}

/**
 * Slugifies a string.
 */
export const toSlug = (input: string): string => {
  return slugify(input, {
    lower: true,
  })
}
