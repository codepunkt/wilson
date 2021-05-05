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

export interface Pagination {
  size: number
}

/**
 * Optional frontmatter fields.
 */
interface FrontmatterOptional {
  draft?: boolean
  date?: string | Date
  permalink?: string
  layout?: string
  opengraphType?: string
  kind?: 'page' | 'term' | 'taxonomy'
  taxonomies?: TaxonomyData // optional for 'page' kind
  taxonomyName?: string // required for 'term' and 'taxonomy' kinds
  taxonomyTerms?: string[] // optional for 'taxonomy' kind
}

/**
 * Required frontmatter fields.
 */
interface FrontmatterRequired {
  title: string
}

/**
 * Optional frontmatter fields that are set to default values when not defined.
 */
export type FrontmatterDefaults = Required<
  Pick<
    FrontmatterOptional,
    'draft' | 'date' | 'kind' | 'opengraphType' | 'taxonomies'
  >
>

/**
 * Page frontmatter.
 */
export type Frontmatter = FrontmatterOptional & FrontmatterRequired

/**
 * Page frontmatter combined with default values.
 */
export type FrontmatterWithDefaults = Frontmatter & FrontmatterDefaults

/**
 * Page-related information, used internally.
 */
export interface Page {
  type: 'typescript' | 'markdown'
  frontmatter: Frontmatter
  date: Date
  source: {
    path: string
    absolutePath: string
  }
  result: {
    path: string
    url: string
  }
}

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
  text: (page: PageFile) => string
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
}

/**
 * Optional site configuration that is set to default values when not defined.
 */
export type SiteConfigDefaults = Required<
  Pick<SiteConfigOptional, 'pageLayouts' | 'taxonomies'>
>

/**
 * Site configuration.
 */
export type SiteConfig = SiteConfigRequired & SiteConfigOptional

/**
 * Site configuration combined with default values.
 */
export type SiteConfigWithDefaults = SiteConfig & SiteConfigDefaults

/**
 * Taxonomy data.
 *
 * Maps taxonomy name (plural) to an array of taxonomy terms,
 * e.g. the `tags` taxonomy to an array of tag strings.
 */
export interface TaxonomyData {
  [taxonomy: string]: string[]
}

/**
 * Taxonomy definition.
 *
 * Maps taxonomy name (plural) to taxonomy placeholder (singular).
 */
export interface TaxonomyDefinition {
  [taxonomy: string]: string
}

export interface PageFile {
  public route: string
  public path: string
  public title: string
  public taxonomies: TaxonomyData | null
  public draft: boolean
  public date: Date
}

/**
 * Exported to the user, can be used as generic props type variable on
 * Layout and Page components.
 */
export interface PageProps {
  title: string
  date: number // timestamp
  taxonomies: TaxonomyData
  tableOfContents: Heading[]
}

export type TaxonomyPageProps = PageProps & {
  pages: PageFile[]
}

export type TermPageProps = PageProps & {
  taxonomyTerms: string[]
}
