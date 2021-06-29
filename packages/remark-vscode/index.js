import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import logger from 'loglevel'
import { visit } from 'unist-util-visit'
import { createGetRegistry } from './src/createGetRegistry.js'
import { setup } from './src/setup.js'
import { getCache } from './src/cache.js'
import { getScope } from './src/storeUtils.js'
import parseCodeFenceInfo from './src/parseCodeFenceInfo.js'
import parseCodeSpanInfo from './src/parseCodeSpanInfo.js'
import getPossibleThemes from './src/getPossibleThemes.js'
import { registerCodeBlock, registerCodeSpan } from './src/registerCodeNode.js'
import createCodeNodeRegistry from './src/createCodeNodeRegistry.js'
import getCodeBlockGraphQLDataFromRegistry from './src/graphql/getCodeBlockDataFromRegistry.js'
import getCodeSpanGraphQLDataFromRegistry from './src/graphql/getCodeSpanDataFromRegistry.js'
import { createStyleElement } from './src/factory/html.js'
import { renderHTML } from './src/renderers/html.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const styles = fs.readFileSync(path.resolve(__dirname, './styles.css'), 'utf8')
const cache = getCache('remark-vscode')

export default (options) => {
  const getRegistry = createGetRegistry()

  return async (tree) => {
    const {
      theme,
      wrapperClassName,
      languageAliases,
      extensions,
      getLineClassName,
      injectStyles,
      replaceColor,
      logLevel,
      getLineTransformers,
      inlineCode,
      ...rest
    } = await setup(options, cache)

    const lineTransformers = getLineTransformers(
      {
        theme,
        wrapperClassName,
        languageAliases,
        extensions,
        getLineClassName,
        injectStyles,
        replaceColor,
        logLevel,
        inlineCode,
        ...rest,
      },
      cache
    )

    // 1. Gather all code fence nodes from Markdown AST.
    const nodes = []
    visit(
      tree,
      ({ type }) => type === 'code' || (inlineCode && type === 'inlineCode'),
      (node) => {
        nodes.push(node)
      }
    )

    // 2. For each code fence found, parse its header, determine what themes it will use,
    //    and register its contents with a central code block registry, performing tokenization
    //    along the way.
    const codeNodeRegistry = createCodeNodeRegistry()
    for (const node of nodes) {
      const text = node.value
      if (!text) continue

      const {
        languageName,
        meta,
        text: parsedText = text,
      } = node.type === 'code'
        ? parseCodeFenceInfo(
            node.lang ? node.lang.toLowerCase() : '',
            node.meta
          )
        : parseCodeSpanInfo(text, inlineCode.marker)

      if (node.type === 'inlineCode' && !languageName) {
        continue
      }

      const grammarCache = await cache.get('grammars')
      const scope = getScope(languageName, grammarCache, languageAliases)

      if (!scope && languageName) {
        logger.warn(
          `Encountered unknown language '${languageName}'. ` +
            `If '${languageName}' is an alias for a supported language, ` +
            `use the 'languageAliases' plugin option to map it to the canonical language name.`
        )
      }

      const nodeData = {
        node,
        // markdownNode,
        language: languageName,
        parsedOptions: meta,
      }

      const possibleThemes = await getPossibleThemes(
        node.type === 'inlineCode' ? inlineCode.theme || theme : theme,
        await cache.get('themes'),
        // Node could be sourced from something other than a File node
        // markdownNode.fileAbsolutePath
        //   ? path.dirname(markdownNode.fileAbsolutePath)
        // : undefined,
        undefined,
        nodeData
      )

      if (node.type === 'inlineCode') {
        await registerCodeSpan(
          codeNodeRegistry,
          node,
          possibleThemes,
          () => getRegistry(cache, scope),
          scope,
          parsedText,
          languageName,
          cache
        )
      } else {
        await registerCodeBlock(
          codeNodeRegistry,
          node,
          possibleThemes,
          () => getRegistry(cache, scope),
          lineTransformers,
          scope,
          parsedText,
          languageName,
          meta,
          cache
        )
      }
    }

    // 3. For each code block/span registered, convert its tokenization and theme data
    //    to a GraphQL-compatible representation, including HTML renderings. At the same
    //    time, change the original code fence Markdown node to an HTML node and set
    //    its value to the HTML rendering contained in the GraphQL node.
    codeNodeRegistry.forEachCodeBlock((codeBlock, node) => {
      const graphQLNode = getCodeBlockGraphQLDataFromRegistry(
        codeNodeRegistry,
        node,
        codeBlock,
        getWrapperClassName,
        getLineClassName
      )

      // Update Markdown node
      node.type = 'html'
      node.value = graphQLNode.html
      delete node.lang
      delete node.meta

      function getWrapperClassName() {
        return typeof wrapperClassName === 'function'
          ? wrapperClassName({
              language: codeBlock.languageName,
              node,
              codeFenceNode: node,
              parsedOptions: codeBlock.meta,
            })
          : wrapperClassName
      }
    })

    codeNodeRegistry.forEachCodeSpan((codeSpan, node) => {
      const graphQLNode = getCodeSpanGraphQLDataFromRegistry(
        codeNodeRegistry,
        node,
        codeSpan,
        getClassName
      )

      // Update Markdown node
      node.type = 'html'
      node.value = graphQLNode.html

      function getClassName() {
        return typeof inlineCode.className === 'function'
          ? inlineCode.className({
              language: codeSpan.languageName,
              node,
            })
          : inlineCode.className
      }
    })

    // 4. Generate CSS rules for each theme used by one or more code blocks in the registry,
    //    then append that CSS to the Markdown AST in an HTML node.
    const styleElement = createStyleElement(
      codeNodeRegistry.getAllPossibleThemes(),
      codeNodeRegistry.getTokenStylesForTheme,
      replaceColor,
      injectStyles ? styles : undefined
    )

    if (styleElement) {
      tree.children.unshift({ type: 'html', value: renderHTML(styleElement) })
    }
  }
}
