import {
  Frontmatter,
  FrontmatterDefaults,
  FrontmatterWithDefaults,
} from '../types'
import { extname } from 'path'
import grayMatter from 'gray-matter'
import { readFileSync } from 'fs-extra'
import {
  AssignmentExpression,
  Identifier,
  MemberExpression,
  ObjectExpression,
} from 'estree'
import { generate } from 'astring'
import { walk } from 'estree-walker'
import acorn, { parse } from 'acorn'
import { JsxEmit, ModuleKind, transpileModule } from 'typescript'

/**
 * Default values for optional properties in frontmatter.
 */
const defaultFrontmatter: FrontmatterDefaults = {
  kind: 'content',
  date: 'Created',
  opengraphType: 'website',
}

class FrontmatterParser {
  private source: string

  constructor(private path: string, private fullPath: string) {
    this.source = readFileSync(fullPath, 'utf-8')
  }

  /**
   * Parses and returns frontmatter
   *
   * @todo default draft on kind: `content` to false
   */
  public parseFrontmatter(): FrontmatterWithDefaults {
    const extension = extname(this.fullPath)

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

    // apply kind-specific defaults
    if (frontmatter.kind === 'content') {
      frontmatter = { draft: false, ...frontmatter }
    }

    this.validateFrontmatter(frontmatter)
    return frontmatter
  }

  /**
   * Validates frontmatter.
   *
   * @todo taxonomy must have permalink
   * @todo taxonomy must have taxonomyName
   * @todo content can only have taxonomies defined in config
   * @todo content can have draft, but must be boolean
   * @todo terms must have taxonomyName
   * @todo select must have taxonomyName
   * @todo select must have selectedTerms
   */
  private validateFrontmatter(frontmatter: FrontmatterWithDefaults): void {
    if (Object.values(frontmatter).length === 0)
      throw new Error(`page has no or empty frontmatter: ${this.path}!`)
    if (frontmatter.title === undefined)
      throw new Error(`frontmatter has no title: ${this.path}!`)
  }

  /**
   * Parses markdown frontmatter.
   */
  private parseMarkdownFrontmatter(): Partial<Frontmatter> {
    const graymatterOptions = {}
    const parsed = grayMatter(this.source, graymatterOptions)
    return parsed.data as Partial<Frontmatter>
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

export default FrontmatterParser
