import chalk from 'chalk'
import { statSync } from 'fs'
import { extname } from 'path'
import {
  BasePagination,
  Page as PageInterface,
  PaginationRoutes,
  TaxonomyData,
  TaxonomyTerm,
} from '../types'
import { getConfig } from './config.js'
import {
  ContentPageSource,
  PageSourceType,
  SelectPageSource,
  TaxonomyPageSource,
  TermsPageSource,
} from './page-source.js'
import { getTaxonomyTerms } from './state.js'
import { toSlug } from './util.js'

const getPaginationRoutes = (
  baseRoute: string,
  pagination: BasePagination
): PaginationRoutes & { currentPage: string } => {
  const { count, currentPage, pageSize } = pagination
  const routeSuffix = getConfig().pagination.routeSuffix

  return {
    currentPage:
      currentPage > 1 ? `${baseRoute}${routeSuffix(currentPage)}` : baseRoute,
    previousPage:
      currentPage > 1
        ? currentPage > 2
          ? `${baseRoute}${routeSuffix(currentPage - 1)}`
          : baseRoute
        : false,
    nextPage:
      count > currentPage * pageSize
        ? `${baseRoute}${routeSuffix(currentPage + 1)}`
        : false,
  }
}

abstract class Page implements PageInterface {
  public abstract route: string
  public abstract path: string
  public abstract title: string
  public date: Date
  public sourcePath: string

  constructor(source: PageSourceType) {
    this.date = this.getDate(source)
    this.sourcePath = source.path
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
      const err = new Error(`Invalid frontmatter date in ${chalk.green(
        `'${this.path}'`
      )}

       Allowed values are:

         ${chalk.grey('-')} ${chalk.green(`'Created'`)}
         ${chalk.grey('-')} ${chalk.green(`'Modified at'`)}
         ${chalk.grey('-')} Date objects
         ${chalk.grey('-')} strings parseable by Date.parse`)

      throw err
    }

    return dateObj
  }

  /**
   * @todo validate permalink: does URL already exist? is URL not empty?
   */
  static getRoute(relativePath: string, permalink?: string): string {
    if (permalink) {
      // ensure there's exactly one leading and trailing slash
      return permalink.replace(/^\/?([^/]+(?:\/[^/]+)*)\/?$/, '/$1/')
    }
    return `/${relativePath
      .replace(new RegExp(`${extname(relativePath)}$`), '')
      .replace(/index$/, '')}/`.replace(/\/\/$/, '/')
  }

  /**
   * Returns relative path to static `.html` file for given route.
   *
   * @param route Page route.
   * @returns Relative path to static `.html`.
   */
  protected getPath(route: string): string {
    return `${route.replace(/^\//, '')}index.html`
  }
}

/**
 * Page created from a `content` source.
 */
export class ContentPage extends Page {
  public route: string
  public path: string
  public title: string
  public taxonomies?: TaxonomyData
  public draft: boolean
  public description?: string

  constructor(source: ContentPageSource) {
    super(source)
    this.taxonomies = source.frontmatter.taxonomies
    this.draft = source.frontmatter.draft
    this.route = Page.getRoute(source.path, source.frontmatter.permalink)
    this.path = this.getPath(this.route)
    this.title = source.frontmatter.title
    this.description = source.frontmatter.description
  }
}

/**
 * Page created from a `taxonomy` source.
 */
export class TaxonomyPage extends Page {
  public route: string
  public path: string
  public title: string
  public taxonomyName: string
  public paginationRoutes: PaginationRoutes

  constructor(
    source: TaxonomyPageSource,
    public selectedTerm: string,
    public contentPages: ContentPage[],
    public pagination: BasePagination
  ) {
    super(source)
    this.taxonomyName = source.frontmatter.taxonomyName
    const { currentPage, previousPage, nextPage } = this.getRoutes(
      source.path,
      source.frontmatter.permalink
    )
    this.route = currentPage
    this.paginationRoutes = { previousPage, nextPage }
    this.path = this.getPath(this.route)
    this.title = this.replacePlaceholder(source.frontmatter.title)
  }

  protected getRoutes(
    relativePath: string,
    permalink?: string
  ): PaginationRoutes & { currentPage: string } {
    const baseRoute = this.replacePlaceholder(
      Page.getRoute(relativePath, permalink),
      true
    )
    return getPaginationRoutes(baseRoute, this.pagination)
  }

  /**
   * Replaces taxonomy placeholders with the page's selected term.
   *
   * @param input Input string.
   * @param slugify Should the selected term be slugified?
   * @returns Resulting string with replaced placeholders.
   */
  private replacePlaceholder(input: string, slugify = false): string {
    return input.replace(
      /\${term}/g,
      slugify ? toSlug(this.selectedTerm) : this.selectedTerm
    )
  }
}

/**
 * Page created from a `terms` source.
 */
export class TermsPage extends Page {
  public route: string
  public path: string
  public title: string
  public taxonomyName: string
  public taxonomyTerms: TaxonomyTerm[]

  constructor(source: TermsPageSource) {
    super(source)
    this.taxonomyName = source.frontmatter.taxonomyName
    this.taxonomyTerms = getTaxonomyTerms(this.taxonomyName).map((name) => ({
      name,
      slug: toSlug(name),
    }))
    this.route = Page.getRoute(source.path, source.frontmatter.permalink)
    this.path = this.getPath(this.route)
    this.title = source.frontmatter.title
  }
}

/**
 * Page created from a `select` source.
 */
export class SelectPage extends Page {
  public route: string
  public path: string
  public title: string
  public taxonomyName: string
  public selectedTerms: string[]
  public paginationRoutes: PaginationRoutes

  constructor(
    source: SelectPageSource,
    public contentPages: ContentPage[],
    public pagination: BasePagination
  ) {
    super(source)
    this.taxonomyName = source.frontmatter.taxonomyName
    this.selectedTerms = source.frontmatter.selectedTerms
    const { currentPage, previousPage, nextPage } = this.getRoutes(
      source.path,
      source.frontmatter.permalink
    )
    this.route = currentPage
    this.paginationRoutes = { previousPage, nextPage }
    this.path = this.getPath(this.route)
    this.title = source.frontmatter.title
  }

  protected getRoutes(
    relativePath: string,
    permalink?: string
  ): PaginationRoutes & { currentPage: string } {
    const baseRoute = Page.getRoute(relativePath, permalink)
    return getPaginationRoutes(baseRoute, this.pagination)
  }
}

export type PageType = ContentPage | TaxonomyPage | TermsPage | SelectPage

export default Page
