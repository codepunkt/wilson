import visit from 'unist-util-visit'
import { Node } from 'unist'
import { Element } from 'hast'

export interface AssetURLTagConfig {
  [tagName: string]: string[]
}

function isRelativeUrl(url: string): boolean {
  return /^\./.test(url)
}

export const assetUrlPrefix = '_assetUrl_'

// @TODO srcset check
// @see https://github.com/vuejs/vue-next/blob/2424768808e493ae1b59860ccb20a7c96d72d20a/packages/compiler-sfc/src/templateTransformSrcset.ts
export function collectAndReplaceAssetUrls(
  htmlAST: Node,
  assetUrlTagConfig: AssetURLTagConfig
): string[] {
  const assetUrls: string[] = []

  visit(htmlAST, 'element', (node: Element) => {
    if (assetUrlTagConfig[node.tagName]) {
      const attributes: string[] = assetUrlTagConfig[node.tagName]
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
    }
  })

  return assetUrls
}
