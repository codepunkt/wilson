import {
  ContentFrontmatterWithDefaults,
  Frontmatter,
  FrontmatterWithDefaults,
  SelectFrontmatterWithDefaults,
  TaxonomyFrontmatterWithDefaults,
  TermsFrontmatterWithDefaults,
} from '../types'
import grayMatter from 'gray-matter'
import { readFileSync } from 'fs-extra'
import Page, { ContentPage, SelectPage, TaxonomyPage, TermsPage } from './page'
import { getContentPages, getTaxonomyTerms } from './state'
import rehypeSlug from 'rehype-slug'
import remarkParse from 'remark-parse'
import remarkToRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import remarkStringify from 'remark-stringify'
import unified from 'unified'
import rehypeRaw from 'rehype-raw'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import remarkRelativeAssets from './unified-plugins/remark-relative-assets'
import rehypeExtractToc from './unified-plugins/rehype-extract-toc'
import { hasCommonElements, transformJsx } from './util'
import { extname } from 'path'
import { getConfig } from './config'

/**
 * Defines attributes on HTML/SVG elements that should be considered when
 * converting relative URLs to imports.
 */
const assetUrlTagConfig: Record<string, string[]> = {
  video: ['src', 'poster'],
  source: ['src'],
  img: ['src'],
  image: ['xlink:href', 'href'],
  use: ['xlink:href', 'href'],
}

/**
 * Asset URL prefix
 */
const assetUrlPrefix = '_assetUrl_'

/**
 * Represents a page source file in `pages` directory.
 */
abstract class PageSource {
  /**
   * Relative path to page source.
   */
  public path: string

  /**
   * Absolute path to page source.
   */
  public fullPath: string

  /**
   * Original page source.
   */
  public originalSource: string

  /**
   * Transformed page source.
   */
  public transformedSource: string | null

  /**
   * Array of page files created from page source.
   *
   * Depending on page source frontmatter `kind`, this can be one or more
   * pages.
   */
  public pages: Page[] = []

  public frontmatter: Frontmatter = {} as Frontmatter

  constructor({ path, fullPath }: BaseOpts) {
    this.path = path
    this.fullPath = fullPath
    this.originalSource = readFileSync(this.fullPath, 'utf-8')
    this.transformedSource = this.transformSource()
  }

  public abstract createPages(): void

  protected transformSource(): string {
    return this.originalSource
  }
}

export class ContentPageSource extends PageSource {
  public frontmatter: ContentFrontmatterWithDefaults
  constructor(options: Opts) {
    super(options)
    this.frontmatter = options.frontmatter as ContentFrontmatterWithDefaults
  }
  public createPages(): void {
    this.pages.push(new ContentPage(this))
  }
}

export class MarkdownContentPageSource extends ContentPageSource {
  protected transformSource(): string {
    return transformJsx(this.transformMarkdown(this.originalSource))
  }

  private transformMarkdown(markdownSource: string): string {
    const processor = unified()
      .use(remarkParse)
      // apply plugins that change MDAST
      .use(remarkStringify)
      .use(remarkToRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      // apply plugins that change HAST
      .use(remarkRelativeAssets, { assetUrlPrefix, assetUrlTagConfig })
      .use(rehypeSlug)
      .use(rehypeExtractToc, { moduleId: this.fullPath })
      // TODO: configure autolink headings
      .use(rehypeAutolinkHeadings, {})
      .use(rehypeStringify, {
        allowDangerousHtml: true,
        closeSelfClosing: true,
      })

    const parsed = grayMatter(markdownSource, {})
    const vfile = processor.processSync(parsed.content)
    const html = vfile.contents as string
    const relativeAssetUrls = (vfile.data as { assetUrls: string[] })
      .assetUrls as string[]

    return this.htmlToPreact(html, relativeAssetUrls)
  }

  /**
   *
   */
  private htmlToPreact(html: string, relativeAssetUrls: string[]): string {
    // create imports from relative asset urls and replace placeholders with imported vars
    const relativeAssetImports = relativeAssetUrls.map((url, i) => {
      html = html.replace(
        new RegExp(`"${assetUrlPrefix}${i}"`, 'g'),
        `{${assetUrlPrefix}${i}}`
      )
      return `import ${assetUrlPrefix}${i} from '${url}';`
    })

    return `
    import { h, Fragment } from "preact";
    ${relativeAssetImports.join('')}

    export const Page = () => {
      return <Fragment>${html}</Fragment>;
    };
  `
  }
}

export class TaxonomyPageSource extends PageSource {
  public frontmatter: TaxonomyFrontmatterWithDefaults
  constructor(options: Opts) {
    super(options)
    this.frontmatter = options.frontmatter as TaxonomyFrontmatterWithDefaults
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

      const pageSize = config.pagination.size
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
  public frontmatter: TermsFrontmatterWithDefaults
  constructor(options: Opts) {
    super(options)
    this.frontmatter = options.frontmatter as TermsFrontmatterWithDefaults
  }
  public createPages(): void {
    this.pages.push(new TermsPage(this))
  }
}

export class SelectPageSource extends PageSource {
  public frontmatter: SelectFrontmatterWithDefaults
  constructor(options: Opts) {
    super(options)
    this.frontmatter = options.frontmatter as SelectFrontmatterWithDefaults
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
    const pageSize = config.pagination.size ?? 2
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

interface BaseOpts {
  path: string
  fullPath: string
}

type Opts = BaseOpts & {
  frontmatter: FrontmatterWithDefaults
}

export const createPageSource = (options: Opts): PageSourceType => {
  switch (options.frontmatter.kind) {
    case 'content':
      return extname(options.fullPath) === '.md'
        ? new MarkdownContentPageSource(options)
        : new ContentPageSource(options)
    case 'taxonomy':
      return new TaxonomyPageSource(options)
    case 'terms':
      return new TermsPageSource(options)
    case 'select':
      return new SelectPageSource(options)
  }
}

export type PageSourceType =
  | ContentPageSource
  | TaxonomyPageSource
  | TermsPageSource
  | SelectPageSource

export default PageSource
