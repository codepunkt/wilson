import { grey, green } from 'chalk'
import { statSync } from 'fs-extra'
import { extname } from 'path'
import { Page as PageInterface, TaxonomyData } from '../types'
import { getConfig } from './config'
import {
  ContentPageSource,
  PageSourceType,
  SelectPageSource,
  TaxonomyPageSource,
  TermsPageSource,
} from './page-source'
import { getContentPages } from './state'

abstract class Page implements PageInterface {
  public route: string
  public path: string
  public title: string
  public date: Date

  constructor(source: PageSourceType) {
    this.route = this.getRoute(source.path, source.frontmatter.permalink)
    this.path = this.getPath()
    this.title = source.frontmatter.title
    this.date = this.getDate(source)
  }

  public abstract replacePlaceholder(): Promise<void>

  /**
   *
   */
  private getDate(source: PageSourceType): Date {
    const date = source.frontmatter.date
    if (date instanceof Date) {
      return date
    } else if (date === 'Created' || date === 'Modified at') {
      const { ctime, mtime } = statSync(source.fullPath)
      return new Date(date === 'Created' ? ctime : mtime)
    }
    const dateObj = new Date(date)
    if (isNaN(+dateObj)) {
      const err = new Error(`Invalid frontmatter date in ${green(
        `'${this.path}'`
      )}

       Allowed values are:

         ${grey('-')} ${green(`'Created'`)}
         ${grey('-')} ${green(`'Modified at'`)}
         ${grey('-')} Date objects
         ${grey('-')} strings parseable by Date.parse`)

      throw err
    }
    return dateObj
  }

  /**
   * Returns page route.
   *
   * @TODO validate permalink
   *   - does URL already exist?
   *   - is URL not empty?
   */
  protected getRoute(path: string, permalink?: string): string {
    return permalink === undefined
      ? `/${path
          .replace(new RegExp(`${extname(path)}$`), '')
          .replace(/index$/, '')}/`.replace(/\/\/$/, '/')
      : permalink.replace(/^\/?([^/]+(?:\/[^/]+)*)\/?$/, '/$1/')
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

export class ContentPage extends Page {
  public taxonomies?: TaxonomyData
  public draft: boolean
  constructor(source: ContentPageSource) {
    super(source)
    this.taxonomies = source.frontmatter.taxonomies
    this.draft = source.frontmatter.draft
  }
  public async replacePlaceholder(): Promise<void> {
    return
  }
}

export class TaxonomyPage extends Page {
  public taxonomyName: string
  constructor(
    source: TaxonomyPageSource,
    public selectedTerm: string,
    public contentPages: ContentPage[],
    public paginationInfo: PaginationInfo
  ) {
    super(source)
    this.taxonomyName = source.frontmatter.taxonomyName
  }
  /**
   * @todo slugify terms. offer the slug function used as wilson export
   */
  public async replacePlaceholder(): Promise<void> {
    const config = await getConfig()
    const placeholder = config.taxonomies[this.taxonomyName]
    const replace = (input: string): string =>
      input.replace(new RegExp(`{{${placeholder}}}`), this.selectedTerm)
    this.route = replace(this.route)
    this.path = replace(this.path)
    this.title = replace(this.title)
  }
}

export class TermsPage extends Page {
  public taxonomyName: string
  constructor(source: TermsPageSource) {
    super(source)
    this.taxonomyName = source.frontmatter.taxonomyName
  }
  public async replacePlaceholder(): Promise<void> {
    return
  }
  public getTaxonomyTerms(): string[] {
    return Array.from(
      new Set([
        ...getContentPages()
          .map(
            (contentPage) => contentPage.taxonomies?.[this.taxonomyName] ?? []
          )
          .flat(),
      ])
    )
  }
}

interface PaginationInfo {
  currentPage: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export class SelectPage extends Page {
  public taxonomyName: string
  public selectedTerms: string[]
  constructor(
    source: SelectPageSource,
    public contentPages: ContentPage[],
    public paginationInfo: PaginationInfo
  ) {
    super(source)
    this.taxonomyName = source.frontmatter.taxonomyName
    this.selectedTerms = source.frontmatter.selectedTerms
  }
  public async replacePlaceholder(): Promise<void> {
    return
  }
}

export type PageType = ContentPage | TaxonomyPage | TermsPage | SelectPage

export default Page
