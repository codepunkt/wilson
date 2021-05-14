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

export interface Dependencies {
  js: string[]
  css: string[]
  assets?: string[]
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

export type FrontmatterContent = {
  kind: 'content'
  taxonomies?: TaxonomyData
  draft?: boolean
}

interface FrontmatterTerms {
  kind: 'terms'
  taxonomyName: string
}

interface FrontmatterTaxonomy {
  kind: 'taxonomy'
  taxonomyName: string
}

interface FrontmatterSelect {
  kind: 'select'
  taxonomyName: string
  selectedTerms: TaxonomyTerms
}

export type FrontmatterDefaults = Required<
  Pick<FrontmatterOptional, 'date' | 'opengraphType'>
> & {
  kind:
    | FrontmatterContent['kind']
    | FrontmatterTerms['kind']
    | FrontmatterTaxonomy['kind']
    | FrontmatterSelect['kind']
}

export type Frontmatter = FrontmatterOptional &
  FrontmatterRequired &
  (
    | FrontmatterContent
    | FrontmatterTerms
    | FrontmatterTaxonomy
    | FrontmatterSelect
  )

export type FrontmatterWithDefaults = Frontmatter & FrontmatterDefaults

export type ContentFrontmatterWithDefaults = FrontmatterOptional &
  FrontmatterRequired &
  FrontmatterContent &
  FrontmatterDefaults & { kind: FrontmatterContent['kind']; draft: boolean }

export type TermsFrontmatterWithDefaults = FrontmatterOptional &
  FrontmatterRequired &
  FrontmatterTerms &
  FrontmatterDefaults & { kind: FrontmatterTerms['kind'] }

export type TaxonomyFrontmatterWithDefaults = FrontmatterOptional &
  FrontmatterRequired &
  FrontmatterTaxonomy &
  FrontmatterDefaults & { kind: FrontmatterTaxonomy['kind'] }

export type SelectFrontmatterWithDefaults = FrontmatterOptional &
  FrontmatterRequired &
  FrontmatterSelect &
  FrontmatterDefaults & { kind: FrontmatterSelect['kind'] }

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
  size?: number
  routeSuffix?: (pageNumber: number) => string
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
}

/**
 * Optional site configuration that is set to default values when not defined.
 */
export type SiteConfigDefaults = Required<
  Pick<SiteConfigOptional, 'pageLayouts' | 'taxonomies' | 'pagination'>
>

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

export interface PaginationInfo {
  currentPage: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export type ContentPageProps = PageProps & {
  tableOfContents: Heading[]
  taxonomies?: TaxonomyData
}

export type SelectPageProps = PageProps & {
  taxonomyPages: Page[]
  paginationInfo: PaginationInfo
}

export type TaxonomyPageProps = SelectPageProps & {
  selectedTerm: string
}

export type TermPageProps = PageProps & {
  taxonomyTerms: string[]
}
