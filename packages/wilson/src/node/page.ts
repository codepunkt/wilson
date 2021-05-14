import { grey, green } from 'chalk'
import { statSync } from 'fs-extra'
import { extname } from 'path'
import { Page as PageInterface, PaginationInfo, TaxonomyData } from '../types'
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
  public abstract route: string
  public abstract path: string
  public abstract title: string
  public date: Date

  constructor(source: PageSourceType) {
    this.date = this.getDate(source)
  }

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

  protected abstract getRoute(relativePath: string, permalink?: string): string
  /**
   * @todo validate permalink: does URL already exist? is URL not empty?
   */
  static getRoute(relativePath: string, permalink?: string): string {
    if (permalink) {
      // ensure there's exactly one leading and trailing slash
      return permalink.replace(/^\/?([^/]+(?:\/[^/]+)*)\/?$/, '/$1/')
    }
    /**
     * @todo simplify. basename?
     */
    return `/${relativePath
      .replace(new RegExp(`${extname(relativePath)}$`), '')
      .replace(/index$/, '')}/`.replace(/\/\/$/, '/')
  }

  protected getPath(): string {
    return this.route.split('/').pop() === 'index'
      ? `${this.route.replace(/^\//, '')}.html`
      : `${this.route.replace(/^\//, '')}index.html`
  }
}

export class ContentPage extends Page {
  public route: string
  public path: string
  public title: string
  public taxonomies?: TaxonomyData
  public draft: boolean
  constructor(source: ContentPageSource) {
    super(source)
    this.taxonomies = source.frontmatter.taxonomies
    this.draft = source.frontmatter.draft
    this.route = this.getRoute(source.path, source.frontmatter.permalink)
    this.path = this.getPath()
    this.title = source.frontmatter.title
  }
  protected getRoute(relativePath: string, permalink?: string): string {
    return Page.getRoute(relativePath, permalink)
  }
}

export class TaxonomyPage extends Page {
  public route: string
  public path: string
  public title: string
  public taxonomyName: string
  constructor(
    source: TaxonomyPageSource,
    public selectedTerm: string,
    public contentPages: ContentPage[],
    public paginationInfo: PaginationInfo
  ) {
    super(source)
    this.taxonomyName = source.frontmatter.taxonomyName
    this.route = this.getRoute(source.path, source.frontmatter.permalink)
    this.path = this.getPath()
    this.title = this.getTitle(source.frontmatter.title)
  }
  /**
   * @todo slugify terms.
   */
  protected getRoute(relativePath: string, permalink?: string): string {
    const placeholder = getConfig().taxonomies[this.taxonomyName]
    let route = Page.getRoute(relativePath, permalink)
    route = route.replace(new RegExp(`{{${placeholder}}}`), this.selectedTerm)
    if (this.paginationInfo.currentPage > 1) {
      route = `${route}page-${this.paginationInfo.currentPage}/`
    }
    return route
  }
  /**
   * @todo slugify terms.
   */
  private getTitle(frontmatterTitle: string): string {
    const placeholder = getConfig().taxonomies[this.taxonomyName]
    return frontmatterTitle.replace(
      new RegExp(`{{${placeholder}}}`),
      this.selectedTerm
    )
  }
}

export class TermsPage extends Page {
  public route: string
  public path: string
  public title: string
  public taxonomyName: string
  constructor(source: TermsPageSource) {
    super(source)
    this.taxonomyName = source.frontmatter.taxonomyName
    this.route = this.getRoute(source.path, source.frontmatter.permalink)
    this.path = this.getPath()
    this.title = source.frontmatter.title
  }
  protected getRoute(relativePath: string, permalink?: string): string {
    return Page.getRoute(relativePath, permalink)
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

export class SelectPage extends Page {
  public route: string
  public path: string
  public title: string
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
    this.route = this.getRoute(source.path, source.frontmatter.permalink)
    this.path = this.getPath()
    this.title = source.frontmatter.title
  }
  protected getRoute(relativePath: string, permalink?: string): string {
    let route = Page.getRoute(relativePath, permalink)
    if (this.paginationInfo.currentPage > 1) {
      route = `${route}page-${this.paginationInfo.currentPage}/`
    }
    return route
  }
}

export type PageType = ContentPage | TaxonomyPage | TermsPage | SelectPage

export default Page
