/**
 * No imports here, just type definitions.
 *
 * If we choose to import types from node or client directory, build
 * folder structure gets screwed up.
 */

/**
 *
 */
export interface SiteData {
  lang?: string
  titleTemplate: string
  description: string
  siteName: string
  siteUrl: string
  author: string
  twitterSite?: string
  twitterCreator?: string
  keywords?: string[]
}

interface FrontmatterOptional {
  date?: string | Date
  permalink?: string
  layout?: string
  opengraphType?: string
}

interface FrontmatterRequired {
  title: string
}

type TaxonomyDefinition = Record<string, string>
type TaxonomyTerms = string[]
type TaxonomyData = Record<string, TaxonomyTerms>

export type ContentFrontmatter = FrontmatterOptional &
  FrontmatterRequired & {
    type?: 'content'
    taxonomies?: TaxonomyData
    draft?: boolean
    description?: string
  }

export type TermsFrontmatter = FrontmatterOptional &
  FrontmatterRequired & {
    type: 'terms'
    taxonomyName: string
  }

/**
 * Has to have `type`, `title`, `taxonomyName` and `permalink`.
 */
export type TaxonomyFrontmatter = FrontmatterOptional &
  FrontmatterRequired & {
    type: 'taxonomy'
    taxonomyName: string
    permalink: string
  }

export type SelectFrontmatter = FrontmatterOptional &
  FrontmatterRequired & {
    type: 'select'
    taxonomyName: string
    selectedTerms: TaxonomyTerms
  }

export type FrontmatterDefaults = Required<
  Pick<FrontmatterOptional, 'date' | 'opengraphType'>
> & {
  type:
    | ContentFrontmatter['type']
    | TermsFrontmatter['type']
    | TaxonomyFrontmatter['type']
    | SelectFrontmatter['type']
}

export type Frontmatter =
  | ContentFrontmatter
  | TermsFrontmatter
  | TaxonomyFrontmatter
  | SelectFrontmatter

export type FrontmatterWithDefaults = Frontmatter & FrontmatterDefaults

export type ContentFrontmatterWithDefaults = FrontmatterOptional &
  FrontmatterRequired &
  ContentFrontmatter &
  FrontmatterDefaults & { type: ContentFrontmatter['type']; draft: boolean }

export type TermsFrontmatterWithDefaults = FrontmatterOptional &
  FrontmatterRequired &
  TermsFrontmatter &
  FrontmatterDefaults & { type: TermsFrontmatter['type'] }

export type TaxonomyFrontmatterWithDefaults = FrontmatterOptional &
  FrontmatterRequired &
  TaxonomyFrontmatter &
  FrontmatterDefaults & { type: TaxonomyFrontmatter['type'] }

export type SelectFrontmatterWithDefaults = FrontmatterOptional &
  FrontmatterRequired &
  SelectFrontmatter &
  FrontmatterDefaults & { type: SelectFrontmatter['type'] }

/**
 * Page-related information, edited for use in the client,
 * e.g. in page/post lists.
 */
export interface ClientPage {
  type: 'typescript' | 'markdown'
  url: string
  title: string
  date: Date
  taxonomies: TaxonomyData
}

export type Feed = {
  href: string
  title: string
}

export interface Heading {
  level: number
  text: string
  slug: string
}

export type PageLayouts = Array<{
  component: string
  pattern?: string
}>

export interface OpengraphImageText {
  text: (page: Page) => string
  font: string
  fontSize?: number
  color?: string
  x?: number
  y?: number
  maxWidth?: number
  maxHeight?: number
  horizontalAlign?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'center' | 'bottom'
}

/**
 * Pagination options.
 */
interface PaginationOptions {
  pageSize?: number
  routeSuffix?: (pageNumber: number) => string
}

/**
 * Feed options.
 */
interface FeedOptions {
  title: string
  output: string
  match?:
    | string
    | ((path: string, frontmatter: ContentFrontmatterWithDefaults) => boolean)
  language?: string
  ttl?: number
  managingEditor?: string
  webMaster?: string
  copyright?: string
}

/**
 * Required site configuration.
 */
interface SiteConfigRequired {
  siteData: SiteData
}

/**
 * Optional site configuration.
 */
interface SiteConfigOptional {
  opengraphImage?: { background: string; texts: OpengraphImageText[] }
  pageLayouts?: { layout: string; pattern?: string }[]
  linkPreloadTest?: (route: string) => boolean
  taxonomies?: TaxonomyDefinition
  pagination?: PaginationOptions
  feeds?: FeedOptions[]
}

/**
 * Optional site configuration that is set to default values when not defined.
 */
export type SiteConfigDefaults = Required<
  Pick<SiteConfigOptional, 'pageLayouts' | 'taxonomies' | 'feeds'>
> & { pagination: Required<PaginationOptions> }

/**
 * Site configuration.
 */
export type SiteConfig = SiteConfigRequired & SiteConfigOptional

/**
 * Site configuration combined with default values.
 */
export type SiteConfigWithDefaults = SiteConfig & SiteConfigDefaults

export interface Page {
  public route: string
  public path: string
  public title: string
  public date: Date
}

interface PageProps {
  title: string
  date: number // timestamp
}

export interface BasePagination {
  count: number
  currentPage: number
  pageSize: number
}

export interface PaginationRoutes {
  previousPage: string | false
  nextPage: string | false
}

export type ClientPagination = BasePagination & PaginationRoutes

export type ContentPageProps = PageProps & {
  headings?: Heading[]
  taxonomies?: TaxonomyData
}

export type SelectPageProps = PageProps & {
  contentPages: Page[]
  pagination: ClientPagination
}

export type TaxonomyPageProps = SelectPageProps & {
  selectedTerm: string
}

export interface TaxonomyTerm {
  name: string
  slug: string
}

export type TermPageProps = PageProps & {
  taxonomyTerms: TaxonomyTerm[]
}
