import {
  ContentFrontmatter,
  Frontmatter,
  FrontmatterDefaults,
  FrontmatterWithDefaults,
  SelectFrontmatter,
  TaxonomyFrontmatter,
} from '../types'
import { extname } from 'path'
import { readFileSync } from 'fs'
import {
  AssignmentExpression,
  Identifier,
  MemberExpression,
  ObjectExpression,
} from 'estree'
import { generate } from 'astring'
import { walk } from 'estree-walker'
import acorn, { parse } from 'acorn'
import typescript from 'typescript'
import { parseFrontmatter } from './markdown.js'
import { getConfig } from './config.js'

/**
 * Default values for optional properties in frontmatter.
 */
const defaultFrontmatter: FrontmatterDefaults = {
  type: 'content',
  date: 'Created',
  opengraphType: 'website',
}

class FrontmatterParser {
  private source: string

  constructor(private path: string) {
    this.source = readFileSync(path, 'utf-8')
  }

  /**
   * Parses and returns frontmatter
   *
   * @todo default draft on type: `content` to false
   */
  public parseFrontmatter(): FrontmatterWithDefaults {
    const extension = extname(this.path)

    let parsed: Partial<Frontmatter>
    if (extension === '.md') {
      parsed = this.parseMarkdownFrontmatter()
    } else {
      parsed = this.parseTypescriptFrontmatter()
    }

    // apply generic defaults
    let frontmatter = {
      ...defaultFrontmatter,
      ...parsed,
    } as FrontmatterWithDefaults

    // apply type-specific defaults
    if (frontmatter.type === 'content') {
      frontmatter = { draft: false, ...frontmatter }
    }

    this.validateFrontmatter(frontmatter)
    return frontmatter
  }

  /**
   * Validates frontmatter.
   */
  private validateFrontmatter(frontmatter: FrontmatterWithDefaults): void {
    // generic validation
    if (Object.values(frontmatter).length === 0)
      this.throw('page has no or empty frontmatter')
    if (frontmatter.title === undefined) this.throw('frontmatter has no title')

    if (frontmatter.type === 'content') {
      const fm = frontmatter as ContentFrontmatter
      if (fm.draft !== undefined && typeof fm.draft !== 'boolean') {
        this.throw('frontmatter.draft is not boolean')
      }
      if (typeof fm.taxonomies !== 'undefined') {
        if (Object.getPrototypeOf(fm.taxonomies) !== Object.prototype) {
          this.throw('frontmatter.taxonomies is not an object literal')
        }
        const { taxonomies } = getConfig()
        for (const taxonomyName in fm.taxonomies) {
          if (!taxonomies[taxonomyName]) {
            this.throw(`taxonomy "${taxonomyName}" is not defined in config`)
          }
          if (!Array.isArray(fm.taxonomies[taxonomyName])) {
            this.throw(`taxonomy "${taxonomyName}" is not an array of strings`)
          }
        }
      }
    } else {
      // taxonomy, select and terms all need `taxonomyName`
      const fm = frontmatter as SelectFrontmatter
      if (fm.taxonomyName === undefined) {
        this.throw('frontmatter.taxonomyName is not defined')
      } else if (typeof fm.taxonomyName !== 'string') {
        this.throw('frontmatter.taxonomyName is not a string')
      }

      if (frontmatter.type === 'select') {
        if (fm.selectedTerms === undefined) {
          this.throw('frontmatter.selectedTerms is not defined')
        } else if (!Array.isArray(fm.selectedTerms)) {
          this.throw('frontmatter.selectedTerms is not an array of strings')
        }
      } else if (frontmatter.type === 'taxonomy') {
        const fm = frontmatter as TaxonomyFrontmatter
        if (fm.permalink === undefined) {
          this.throw('frontmatter.permalink is not defined')
        } else if (typeof fm.permalink !== 'string') {
          this.throw('frontmatter.permalink is not a string')
        }
      }
    }
  }

  private throw(message: string): void {
    throw new Error(`${message}: ${this.path}`)
  }

  /**
   * Parses markdown frontmatter.
   */
  private parseMarkdownFrontmatter(): Partial<Frontmatter> {
    const { frontmatter } = parseFrontmatter(this.source)
    return frontmatter as Partial<Frontmatter>
  }

  /**
   * Parses typescript frontmatter.
   */
  private parseTypescriptFrontmatter(): Partial<Frontmatter> {
    const javascriptString = this.transpileTypescriptToJavascript(this.source)
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
      module: typescript.ModuleKind.CommonJS,
      jsx: typescript.JsxEmit.ReactJSX,
      jsxImportSource: 'preact',
    }
    const transpileOptions = { compilerOptions }
    const transpileOutput = typescript.transpileModule(
      typescriptString,
      transpileOptions
    )

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

export default FrontmatterParser
