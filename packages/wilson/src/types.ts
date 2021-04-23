import { pageTypes } from './plugins/pages'

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

export interface Frontmatter {
  title: string
  draft?: boolean
  layout?: string
  ogType?: string
  [key: string]: any
}

export interface Page {
  type: keyof typeof pageTypes
  frontmatter: Frontmatter
  source: {
    path: string
    absolutePath: string
  }
  result: {
    path: string
    url: string
  }
}

export interface Heading {
  level: number
  text: string
  slug: string
}

export interface LayoutProps {
  frontmatter: Frontmatter
  toc: Heading[]
}

export type PageLayouts = Array<{
  component: string
  pattern?: string
}>

export interface OpengraphImageText {
  text: (frontmatter?: Frontmatter) => string
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
  linkPreloadTest: (targetPage: Page) => boolean
}
