import grayMatter from 'gray-matter'
import NodeCache from 'node-cache'
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
import { assetUrlPrefix, assetUrlTagConfig } from './constants'
import { Heading } from '../types'

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
export const transformMarkdown = (
  markdownCode: string
): MarkdownTransformResult => {
  const cachedResult = transformCache.get<MarkdownTransformResult>(markdownCode)

  if (cachedResult) {
    return cachedResult
  }

  const processor = unified()
    .use(remarkParse)
    // apply plugins that change MDAST
    .use(remarkStringify)
    .use(remarkToRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    // apply plugins that change HAST and gather additional information
    .use(remarkRelativeAssets, { assetUrlPrefix, assetUrlTagConfig })
    .use(rehypeSlug)
    .use(rehypeExtractToc)
    // TODO: configure autolink headings
    .use(rehypeAutolinkHeadings, {})
    .use(rehypeStringify, {
      allowDangerousHtml: true,
      closeSelfClosing: true,
    })

  const { markdown: withoutFrontmatter } = parseFrontmatter(markdownCode)
  const vfile = processor.processSync(withoutFrontmatter)
  const { assetUrls, headings } = vfile.data as Omit<
    MarkdownTransformResult,
    'html'
  >
  const html = vfile.contents as string
  const result: MarkdownTransformResult = { html, assetUrls, headings }
  transformCache.set<MarkdownTransformResult>(markdownCode, result)

  return result
}
