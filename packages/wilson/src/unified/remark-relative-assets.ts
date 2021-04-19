import visit from 'unist-util-visit'
import { Element, Node } from 'hast'
import { VFile } from 'vfile'

const isRelativeUrl = (url: string): boolean => /^\./.test(url)

interface Options {
  assetUrlPrefix: string
  assetUrlTagConfig: Record<string, string[]>
}

/**
 *
 */
const remarkRelativeAssets: (
  options: Options
) => (tree: Node, file: VFile) => void = ({
  assetUrlPrefix,
  assetUrlTagConfig,
}) => {
  return (tree: Node, file: VFile) => {
    const assetUrls: string[] = []
    visit(tree, 'element', visitor)
    file.data = { assetUrls }

    function visitor(node: Element) {
      const attributes = assetUrlTagConfig[node.tagName]
      if (!attributes) return
      const properties = node.properties!

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

      return visit.EXIT
    }
  }
}

export default remarkRelativeAssets
