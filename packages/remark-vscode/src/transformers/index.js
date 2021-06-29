import { highlightMetaTransformer } from './highlightMetaTransformer.js'
import { createHighlightDirectiveLineTransformer } from './highlightDirectiveLineTransformer.js'
import { createLineNumberLineTransformer } from './lineNumberTransformer.js'
import { createDiffLineTransformer } from './diffLineTransformer.js'

export const getDefaultLineTransformers = (pluginOptions, cache) => [
  createHighlightDirectiveLineTransformer(pluginOptions.languageAliases, cache),
  highlightMetaTransformer,
  createLineNumberLineTransformer(pluginOptions.languageAliases, cache),
  createDiffLineTransformer(),
]

export const addLineTransformers =
  (...transformers) =>
  (pluginOptions, cache) =>
    [...transformers, ...getDefaultLineTransformers(pluginOptions, cache)]
