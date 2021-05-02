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
import { objectSourceToObject } from './eval'
import PageFile from './page-file'
import { pageTypes } from './constants'
import { getTags } from './state'
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
  tags: [],
  opengraphType: 'website',
}

type PageSourceType = 'markdown' | 'typescript'

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
   * The type of page source.
   */
  public type: PageSourceType

  /**
   * Array of page files created from page source.
   *
   * In most cases, one page source will lead to one page file.
   * If the page source has `multiple` in frontmatter, it is
   * possible that multiple page files are created.
   */
  public pageFiles: PageFile[] = []

  /**
   * The frontmatter, parsed from page source.
   */
  public frontmatter: FrontmatterWithDefaults

  constructor(path: string, fullPath: string) {
    this.path = path
    this.fullPath = fullPath
    this.type = this.getType()
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
    switch (this.type) {
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
   *
   */
  public setPageFiles(): void {
    if (this.frontmatter.multiple === 'tags') {
      const tags = getTags()

      this.pageFiles = tags.map((tag) => {
        return new PageFile(this, {
          '{{tag}}': tag,
        })
        // return new PageFile(
        //   {
        //     ...this.frontmatter,
        //     permalink: this.frontmatter.permalink!.replace(/\{\{tag\}\}/, tag),
        //     title: this.frontmatter.title.replace(/\{\{tag\}\}/, tag),
        //   },
        //   this.path
        // )
      })
    } else {
      this.pageFiles = [new PageFile(this)]
    }
  }

  /**
   * Returns the type (e.g. `markdown`) of the page source.
   */
  private getType(): PageSourceType {
    const moduleExtension = extname(this.fullPath)

    for (const pageType in pageTypes) {
      if (pageTypes[pageType].includes(moduleExtension)) {
        return pageType as PageSourceType
      }
    }

    throw new Error(`unknown page source type: ${this.path}`)
  }

  /**
   *
   */
  private parseFrontmatter(): FrontmatterWithDefaults {
    let frontmatter: Partial<Frontmatter>
    if (this.type === 'markdown') {
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

    return { ...objectSourceToObject(objSource) } as Partial<Frontmatter>
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
