import { extname } from 'path'
import {
  Frontmatter,
  FrontmatterDefaults,
  FrontmatterWithDefaults,
} from '../types'
import grayMatter from 'gray-matter'
import { readFileSync } from 'fs-extra'
import { transpileModule, ModuleKind, JsxEmit } from 'typescript'
import acorn, { parse } from 'acorn'
import { walk } from 'estree-walker'
import {
  ObjectExpression,
  AssignmentExpression,
  MemberExpression,
  Identifier,
} from 'estree'
import { generate } from 'astring'
import PageFile from './page-file'
import { pageFileTypes } from './constants'
import { getTaxonomyTerms } from './state'
import rehypeSlug from 'rehype-slug'
import remarkParse from 'remark-parse'
import remarkToRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import remarkStringify from 'remark-stringify'
import unified from 'unified'
import rehypeRaw from 'rehype-raw'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import remarkRelativeAssets from './unified/remark-relative-assets'
import rehypeExtractToc from './unified/rehype-extract-toc'
import { transformJsx } from './util'
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
 * Default values for optional properties in frontmatter.
 */
const defaultFrontmatter: FrontmatterDefaults = {
  draft: false,
  date: 'Created',
  opengraphType: 'website',
  kind: 'page',
  taxonomies: {},
}

type FileType = 'markdown' | 'typescript'

/**
 * Represence a page source file in `pages` directory.
 */
class PageSource {
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
   *
   */
  public status: 'constructed' | 'initialized'

  /**
   * The file type of page source.
   */
  public fileType: FileType

  /**
   * Array of page files created from page source.
   *
   * Depending on page source frontmatter `kind`, this can be one or more
   * pages.
   */
  public pageFiles: PageFile[] = []

  /**
   * The frontmatter, parsed from page source.
   */
  public frontmatter: FrontmatterWithDefaults

  constructor(path: string, fullPath: string) {
    this.path = path
    this.fullPath = fullPath
    this.fileType = this.getType()
    this.originalSource = readFileSync(this.fullPath, 'utf-8')
    this.frontmatter = this.parseFrontmatter()
    this.transformedSource = null
    this.status = 'constructed'
  }

  /**
   *
   */
  public async initialize(): Promise<void> {
    this.transformedSource = await this.transformSource()
    this.status = 'initialized'
  }

  /**
   *
   */
  private async transformSource(): Promise<string | null> {
    switch (this.fileType) {
      case 'typescript':
        return null
      case 'markdown':
        return transformJsx(await this.transformMarkdown(this.originalSource))
    }
  }

  /**
   *
   */
  private async transformMarkdown(markdownSource: string): Promise<string> {
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
    const vfile = await processor.process(parsed.content)
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

  /**
   * Creates pages created from the page source.
   *
   * For page source kind `page`, this creates a single page.
   * For page source kind `taxonomy`, it creates:
   * - a single page (if frontmatter.taxonomyTerms is set)
   * - one page for each taxonomy term (if frontmatter.taxonomyTerms is not set)
   */
  public async setPageFiles(): Promise<void> {
    if (
      this.frontmatter.kind === 'page' ||
      this.frontmatter.kind === 'term' ||
      (this.frontmatter.kind === 'taxonomy' &&
        Array.isArray(this.frontmatter.taxonomyTerms))
    ) {
      this.pageFiles = [new PageFile(this)]
    } else if (this.frontmatter.kind === 'taxonomy') {
      // eslint-disable-next-line
      const taxonomyName = this.frontmatter.taxonomyName!
      const terms = await getTaxonomyTerms(taxonomyName)
      const config = await getConfig()

      this.pageFiles = terms.map((term) => {
        return new PageFile(this, {
          placeholder: config.taxonomies[taxonomyName],
          value: term,
        })
      })
    }
  }

  /**
   * Returns the type (e.g. `markdown`) of the page source.
   */
  private getType(): FileType {
    const moduleExtension = extname(this.fullPath)

    for (const pageFileType in pageFileTypes) {
      if (pageFileTypes[pageFileType].includes(moduleExtension)) {
        return pageFileType as FileType
      }
    }

    throw new Error(`unknown page source type: ${this.path}`)
  }

  /**
   *
   */
  private parseFrontmatter(): FrontmatterWithDefaults {
    let frontmatter: Partial<Frontmatter>
    if (this.fileType === 'markdown') {
      frontmatter = this.parseMarkdownFrontmatter()
    } else {
      frontmatter = this.parseTypescriptFrontmatter()
    }

    if (Object.values(frontmatter).length === 0)
      throw new Error(`page has no or empty frontmatter: ${this.path}!`)
    if (frontmatter.title === undefined)
      throw new Error(`frontmatter has no title: ${this.path}!`)

    return { ...defaultFrontmatter, ...frontmatter } as FrontmatterWithDefaults
  }

  /**
   *
   * @param markdownString
   * @returns
   */
  private parseMarkdownFrontmatter(): Partial<Frontmatter> {
    const graymatterOptions = {}
    const parsed = grayMatter(this.originalSource, graymatterOptions)
    return parsed.data as Partial<Frontmatter>
  }

  /**
   *
   */
  private parseTypescriptFrontmatter(): Partial<Frontmatter> {
    const javascriptString = this.transpileTypescriptToJavascript(
      this.originalSource
    )
    const javascriptAST = this.createJavascriptAST(javascriptString)

    let frontmatterNode: ObjectExpression | null = null
    walk(javascriptAST, {
      enter(node) {
        // we're only interested in AssignmentExpression
        if (node.type !== 'AssignmentExpression') return

        // we're only interested in equal assignments between a MemberExpression
        // and an ObjectExpression
        const ae = node as AssignmentExpression
        if (
          ae.operator !== '=' ||
          ae.left.type !== 'MemberExpression' ||
          ae.right.type !== 'ObjectExpression'
        ) {
          return
        }

        // we're only interested in AssignmentExpression where the left
        // MemberExpression has object and property Identifier that say
        // `exports frontmatter`
        const me = ae.left as MemberExpression
        if (
          me.object.type !== 'Identifier' ||
          me.property.type !== 'Identifier' ||
          (me.object as Identifier).name !== 'exports' ||
          (me.property as Identifier).name !== 'frontmatter'
        ) {
          return
        }

        // found an `exports frontmatter = <ObjectExpression>` node.
        // we are interested in the ObjectExpression, so that's what we keep.
        frontmatterNode = ae.right as ObjectExpression
      },
    })

    const objSource = frontmatterNode
      ? generate(frontmatterNode, { indent: '', lineEnd: '' })
      : '{}'

    return {
      ...eval(`const obj=()=>(${objSource});obj`)(),
    } as Frontmatter
  }

  /**
   * Transpiles TypeScript source code to JavaScript source code.
   */
  private transpileTypescriptToJavascript(typescriptString: string): string {
    const compilerOptions = {
      module: ModuleKind.CommonJS,
      jsx: JsxEmit.ReactJSX,
      jsxImportSource: 'preact',
    }
    const transpileOptions = { compilerOptions }
    const transpileOutput = transpileModule(typescriptString, transpileOptions)

    return transpileOutput.outputText
  }

  /**
   * Creates a JavaScript AST for JavaScript source code.
   */
  private createJavascriptAST(javascriptString: string): acorn.Node {
    const acornOptions: acorn.Options = { ecmaVersion: 'latest' }
    const ast = parse(javascriptString, acornOptions)
    return ast
  }
}

export default PageSource
