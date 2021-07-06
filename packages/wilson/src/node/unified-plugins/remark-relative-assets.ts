import { visit, EXIT } from 'unist-util-visit'
import { Element } from 'hast'
import { Transformer } from 'unified'

const isRelativeUrl = (url: string): boolean => /^\./.test(url)

interface Options {
  assetUrlPrefix: string
  assetUrlTagConfig: Record<string, string[]>
}

/**
 *
 */
const remarkRelativeAssets: (options: Options) => Transformer = ({
  assetUrlPrefix,
  assetUrlTagConfig,
}) => {
  return (tree, file) => {
    const assetUrls: string[] = []
    visit(tree, 'element', visitor)
    ;(file.data as Record<string, unknown>).assetUrls = assetUrls

    function visitor(node: Element) {
      const attributes = assetUrlTagConfig[node.tagName]
      if (!attributes) return
      if (node.properties === undefined) return

      const properties = node.properties

      attributes.forEach((attribute) => {
        if (typeof properties[attribute] !== 'string') return
        const assetUrl = properties[attribute] as string
        if (!isRelativeUrl(assetUrl)) return
        const index = assetUrls.findIndex((url) => url === assetUrl)
        if (index === -1) {
          properties[attribute] = `${assetUrlPrefix}${assetUrls.length}`
          assetUrls.push(assetUrl)
        } else {
          properties[attribute] = `${assetUrlPrefix}${index}`
        }
      })

      return EXIT
    }
  }
}

export default remarkRelativeAssets
