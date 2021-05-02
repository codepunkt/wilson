import { statSync } from 'fs-extra'
import { extname } from 'path'
import { PageFile as PageFileType } from '../types'
import PageSource from './page-source'

class PageFile implements PageFileType {
  public route: string
  public path: string
  public title: string
  public tags: string[]
  public draft: boolean
  public date: Date

  constructor(source: PageSource, replaceMap?: Record<string, string>) {
    let title = source.frontmatter.title

    if (replaceMap) {
      for (const key of Object.keys(replaceMap)) {
        title = title.replace(new RegExp(key), replaceMap[key])
      }
    }

    this.route = this.getRoute(source, replaceMap)
    this.path = this.getPath()
    this.title = title
    this.tags = source.frontmatter.tags
    this.draft = source.frontmatter.draft
    this.date = this.getDate(source)
  }

  /**
   *
   */
  private getDate(source: PageSource): Date {
    const date = source.frontmatter.date
    if (date instanceof Date) {
      return date
    } else if (date === 'Created' || date === 'Modified at') {
      const { ctime, mtime } = statSync(source.fullPath)
      return new Date(date === 'Created' ? ctime : mtime)
    }
    return new Date(date)
  }

  /**
   * Returns page route.
   *
   * @TODO validate permalink
   *   - does URL already exist?
   *   - is URL not empty?
   */
  private getRoute(
    source: PageSource,
    replaceMap?: Record<string, string>
  ): string {
    if (source.frontmatter.permalink !== undefined) {
      let route = source.frontmatter.permalink.replace(
        /^\/?([^/]+(?:\/[^/]+)*)\/?$/,
        '/$1/'
      )
      if (replaceMap) {
        for (const key of Object.keys(replaceMap)) {
          route = route.replace(new RegExp(key), replaceMap[key])
        }
      }
      return route
    }
    return `/${source.path
      .replace(new RegExp(`${extname(source.path)}$`), '')
      .replace(/index$/, '')}/`.replace(/\/\/$/, '/')
  }

  /**
   *
   */
  private getPath(): string {
    return this.route.split('/').pop() === 'index'
      ? `${this.route.replace(/^\//, '')}.html`
      : `${this.route.replace(/^\//, '')}index.html`
  }
}

export default PageFile
