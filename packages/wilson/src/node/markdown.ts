import grayMatter from 'gray-matter'
import NodeCache from 'node-cache'
import rehypeSlug from 'rehype-slug'
import remarkParse from 'remark-parse'
import remarkToRehype from 'remark-rehype'
import { Node } from 'unist'
import remarkStringify from 'remark-stringify'
import rehypeRaw from 'rehype-raw'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import remarkRelativeAssets from './unified-plugins/remark-relative-assets.js'
import rehypeExtractToc from './unified-plugins/rehype-extract-toc.js'
import { assetUrlPrefix, assetUrlTagConfig } from './constants.js'
import { Heading } from '../types'
import { unified, Processor } from 'unified'
import { getConfig } from './config.js'
// eslint-disable-next-line
// @ts-ignore
import toJsx from '@mapbox/hast-util-to-jsx'
// eslint-disable-next-line
// @ts-ignore
import syntaxHighlighting from 'gatsby-remark-vscode'

const frontmatterCache = new NodeCache()

/**
 * Result of parsing frontmatter from markdown source code.
 */
type FrontmatterParseResult = {
  /**
   * Markdown source code without the parsed frontmatter.
   */
  markdown: string
  /**
   * The parsed frontmatter data.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  frontmatter: Record<string, any>
}

/**
 * Parses frontmatter from a markdown string.
 *
 * Converts a markdown string with frontmatter into a FrontmatterParseResult
 * object with `markdown` and `frontmatter` properties.
 *
 * @param markdownCode The markdown code to parse
 * @returns The FrontmatterParseResult object
 */
export const parseFrontmatter = (
  markdownCode: string
): FrontmatterParseResult => {
  const cachedResult =
    frontmatterCache.get<FrontmatterParseResult>(markdownCode)

  if (cachedResult) {
    return cachedResult
  }

  const { content: markdown, data: frontmatter } = grayMatter(markdownCode)
  frontmatterCache.set<FrontmatterParseResult>(markdownCode, {
    markdown,
    frontmatter,
  })
  return { markdown, frontmatter }
}

const transformCache = new NodeCache()

type MarkdownTransformResult = {
  /**
   * HTML source code.
   */
  html: string
  /**
   * Array of all relative asset URLs.
   */
  assetUrls: string[]
  /**
   * Array of Heading objects.
   */
  headings: Heading[]
}

/**
 * Transforms a markdown string to HTML.
 *
 * Returns a MarkdownTransformResult object with the resulting HTML code in
 * the `html` property and additional information that was gathered during the
 * transformation such as `headings` and `assetUrls`.
 *
 * @todo is rehype-react applicable here?
 *
 * @param markdownCode The markdown code to parse
 * @returns The MarkdownTransformResult object
 */
export const transformMarkdown = async (
  markdownCode: string
): Promise<MarkdownTransformResult> => {
  const cachedResult = transformCache.get<MarkdownTransformResult>(markdownCode)

  if (cachedResult) {
    return cachedResult
  }

  const { syntaxHighlighting: syntaxHighlightingOptions } = getConfig()

  const processor = unified()
    .use(remarkParse)
    // apply plugins that change MDAST
    .use(remarkStringify)
    .use(syntaxHighlighting.remarkPlugin, syntaxHighlightingOptions)
    .use(remarkToRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    // apply plugins that change HAST and gather additional information
    .use(remarkRelativeAssets, { assetUrlPrefix, assetUrlTagConfig })
    .use(rehypeSlug)
    .use(rehypeExtractToc)
    // TODO: configure autolink headings
    .use(rehypeAutolinkHeadings, {})
    .use(function stringifyToJsx(this: Processor): void {
      this.Compiler = (tree: Node) => toJsx(tree)
    })

  const { markdown: withoutFrontmatter } = parseFrontmatter(markdownCode)
  const vfile = await processor.process(withoutFrontmatter)

  const result: MarkdownTransformResult = {
    html: (vfile.value as string)
      .replace(/^<div>/, '<>')
      .replace(/<\/div>$/, '</>'),
    assetUrls: (vfile.data as MarkdownTransformResult).assetUrls as string[],
    headings: (vfile.data as MarkdownTransformResult).headings as Heading[],
  }

  transformCache.set<MarkdownTransformResult>(markdownCode, result)
  return result
}
