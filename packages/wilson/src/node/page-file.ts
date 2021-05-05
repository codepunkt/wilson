import { statSync } from 'fs-extra'
import { extname } from 'path'
import { PageFile as PageFileType, TaxonomyData } from '../types'
import PageSource from './page-source'

let id = 0

interface TaxonomyReplace {
  placeholder: string
  value: string
}

class PageFile implements PageFileType {
  public id: number
  public route: string
  public path: string
  public title: string
  public draft: boolean
  public date: Date
  public taxonomies: TaxonomyData | null
  public taxonomyReplace: TaxonomyReplace | null

  constructor(source: PageSource, taxonomyReplace?: TaxonomyReplace) {
    this.id = ++id
    this.taxonomyReplace = taxonomyReplace ?? null
    this.route = this.getRoute(source)
    this.path = this.getPath()
    this.title = this.replacePlaceholder(source.frontmatter.title)
    this.draft = source.frontmatter.draft
    this.date = this.getDate(source)
    this.taxonomies = source.frontmatter.taxonomies
  }

  /**
   * Replace a placeholder from frontmatter for taxonomy pages.
   */
  private replacePlaceholder(input: string): string {
    return this.taxonomyReplace
      ? input.replace(
          new RegExp(`{{${this.taxonomyReplace.placeholder}}}`),
          this.taxonomyReplace.value
        )
      : input
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
  private getRoute(source: PageSource): string {
    return source.frontmatter.permalink === undefined
      ? `/${source.path
          .replace(new RegExp(`${extname(source.path)}$`), '')
          .replace(/index$/, '')}/`.replace(/\/\/$/, '/')
      : this.replacePlaceholder(
          source.frontmatter.permalink.replace(
            /^\/?([^/]+(?:\/[^/]+)*)\/?$/,
            '/$1/'
          )
        )
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
