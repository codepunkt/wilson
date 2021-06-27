import {
  ContentFrontmatterWithDefaults,
  Frontmatter,
  FrontmatterWithDefaults,
  Heading,
  SelectFrontmatterWithDefaults,
  TaxonomyFrontmatterWithDefaults,
  TermsFrontmatterWithDefaults,
} from '../types'
import { readFileSync } from 'fs-extra'
import { ContentPage, SelectPage, TaxonomyPage, TermsPage } from './page'
import { getContentPages, getTaxonomyTerms } from './state'
import { hasCommonElements, transformJsx } from './util'
import { extname } from 'path'
import { getConfig } from './config'
import { transformMarkdown } from './markdown'
import { assetUrlPrefix } from './constants'

/**
 * Represents a page source file in `pages` directory.
 */
abstract class PageSource {
  public path: string
  public fullPath: string
  public transformedCode: string | null = null
  abstract pages: unknown[]
  public headings?: Heading[]
  public frontmatter: Frontmatter = {} as Frontmatter

  constructor(path: string, fullPath: string) {
    this.path = path
    this.fullPath = fullPath
  }

  public initialize(): void {
    this.transformedCode = this.transformCode(
      readFileSync(this.fullPath, 'utf-8')
    )
  }

  public abstract createPages(): void

  protected transformCode(originalSource: string): string {
    return originalSource
  }
}

export class ContentPageSource extends PageSource {
  public pages: ContentPage[] = []
  public frontmatter: ContentFrontmatterWithDefaults

  constructor(
    path: string,
    fullPath: string,
    frontmatter: FrontmatterWithDefaults
  ) {
    super(path, fullPath)
    this.frontmatter = frontmatter as ContentFrontmatterWithDefaults
  }

  public createPages(): void {
    this.pages.push(new ContentPage(this))
  }
}

export class MarkdownPageSource extends ContentPageSource {
  public headings: Heading[] = []

  protected transformCode(markdownCode: string): string {
    const { html, headings, assetUrls } = transformMarkdown(markdownCode)

    // store headings for further use
    this.headings = headings

    // replace relative asset URL string attributes with react-style variable
    // interpolations
    let htmlCode = html
    assetUrls.forEach((_, i) => {
      htmlCode = htmlCode.replace(
        new RegExp(`"${assetUrlPrefix}${i}"`, 'g'),
        `{${assetUrlPrefix}${i}}`
      )
    })

    const relativeAssetImports = assetUrls.map(
      (url, i) => `import ${assetUrlPrefix}${i} from '${url}';`
    )

    const preactCode = `
      import { h, Fragment } from "preact";
      ${relativeAssetImports.join('')}

      export const Page = () => {
        return <div dangerouslySetInnerHTML={{ __html: \`${htmlCode}\` }} />;
      };
    `

    const jsCode = transformJsx(preactCode)
    return jsCode
  }
}

export class TaxonomyPageSource extends PageSource {
  public pages: TaxonomyPage[] = []
  public frontmatter: TaxonomyFrontmatterWithDefaults
  constructor(
    path: string,
    fullPath: string,
    frontmatter: FrontmatterWithDefaults
  ) {
    super(path, fullPath)
    this.frontmatter = frontmatter as TaxonomyFrontmatterWithDefaults
  }
  public createPages(): void {
    const terms = getTaxonomyTerms(this.frontmatter.taxonomyName)
    const config = getConfig()
    for (const term of terms) {
      const pages = getContentPages()
        .filter((contentPage) =>
          contentPage.taxonomies?.[this.frontmatter.taxonomyName]?.includes(
            term
          )
        )
        // sort by page date, descending
        .sort((a, b) => +b.date - +a.date)

      const pageSize = config.pagination.pageSize
      let currentPage = 1
      for (let i = 0, j = pages.length; i < j; i += pageSize) {
        this.pages.push(
          new TaxonomyPage(this, term, pages.slice(i, i + pageSize), {
            count: pages.length,
            currentPage,
            pageSize,
          })
        )
        currentPage++
      }
    }
  }
}

export class TermsPageSource extends PageSource {
  public pages: TermsPage[] = []
  public frontmatter: TermsFrontmatterWithDefaults
  constructor(
    path: string,
    fullPath: string,
    frontmatter: FrontmatterWithDefaults
  ) {
    super(path, fullPath)
    this.frontmatter = frontmatter as TermsFrontmatterWithDefaults
  }
  public createPages(): void {
    this.pages.push(new TermsPage(this))
  }
}

export class SelectPageSource extends PageSource {
  public pages: SelectPage[] = []
  public frontmatter: SelectFrontmatterWithDefaults
  constructor(
    path: string,
    fullPath: string,
    frontmatter: FrontmatterWithDefaults
  ) {
    super(path, fullPath)
    this.frontmatter = frontmatter as SelectFrontmatterWithDefaults
  }
  public createPages(): void {
    const { selectedTerms, taxonomyName } = this.frontmatter
    const config = getConfig()
    const pages = getContentPages()
      .reduce(
        (acc, p) =>
          hasCommonElements(selectedTerms, p.taxonomies?.[taxonomyName] ?? [])
            ? [...acc, p]
            : acc,
        [] as ContentPage[]
      )
      // sort by page date, descending
      .sort((a, b) => +b.date - +a.date)
    /**
     * @todo size should have a default value prior to this
     * code being executed
     */
    const pageSize = config.pagination.pageSize ?? 2
    let currentPage = 1
    for (let i = 0, j = pages.length; i < j; i += pageSize) {
      this.pages.push(
        new SelectPage(this, pages.slice(i, i + pageSize), {
          count: pages.length,
          currentPage,
          pageSize,
        })
      )
      currentPage++
    }
  }
}

export const createPageSource = (
  path: string,
  fullPath: string,
  frontmatter: FrontmatterWithDefaults
): PageSourceType => {
  let pageSource: PageSourceType
  const constructorArgs: Parameters<typeof createPageSource> = [
    path,
    fullPath,
    frontmatter,
  ]

  switch (frontmatter.type) {
    case 'taxonomy':
      pageSource = new TaxonomyPageSource(...constructorArgs)
      break
    case 'terms':
      pageSource = new TermsPageSource(...constructorArgs)
      break
    case 'select':
      pageSource = new SelectPageSource(...constructorArgs)
      break
    case 'content':
    default:
      pageSource =
        extname(fullPath) === '.md'
          ? new MarkdownPageSource(...constructorArgs)
          : new ContentPageSource(...constructorArgs)
      break
  }

  pageSource.initialize()
  return pageSource
}

export type PageSourceType =
  | ContentPageSource
  | TaxonomyPageSource
  | TermsPageSource
  | SelectPageSource

export default PageSource
