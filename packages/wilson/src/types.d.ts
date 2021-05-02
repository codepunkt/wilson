/**
 * No imports here, just type definitions.
 *
 * If we choose to import types from node or client directory, build
 * folder structure gets screwed up.
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

export interface FrontmatterOptional {
  tags?: string[]
  draft?: boolean
  date?: string | Date
  permalink?: string
  layout?: string
  opengraphType?: string
  multiple?: 'tags'
  inject?: {
    pages: {
      tags: string[]
      pagination?: Pagination
    }
  }
}

export interface FrontmatterRequired {
  title: string
}

export interface FrontmatterDefaults {
  tags: string[]
  draft: boolean
  date: string | Date
  opengraphType: string
}

export type Frontmatter = FrontmatterOptional & FrontmatterRequired
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
  tags: string[]
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
  text: (title: string, date: Date, tags: string[]) => string
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

export interface UserConfig {
  siteData: SiteData
  opengraphImage?: { background: string; texts: OpengraphImageText[] }
  pageLayouts?: { layout: string; pattern?: string }[]
  linkPreloadTest: (route: string) => boolean
}

export interface PageFile {
  public route: string
  public path: string
  public title: string
  public tags: string[]
  public draft: boolean
  public date: Date
}

export interface ComponentProps {
  title: string
  date: number // timestamp
  tags: string[]
  tableOfContents: Heading[]
  inject: {
    pages?: PageFile[]
  }
}
