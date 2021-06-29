import logger from 'loglevel'
import defaultHost from './host.js'
import validateOptions from './validateOptions.js'
import { getDefaultLineTransformers } from './transformers/index.js'
import { processExtensions } from './processExtension.js'
import { createOnce } from './utils.js'

const once = createOnce()

export function setup(options, cache) {
  return once(() => setupOptions(options, cache), 'setup')
}

async function setupOptions(
  {
    theme = 'Default Dark+',
    wrapperClassName = '',
    languageAliases = {},
    extensions = [],
    getLineClassName = () => '',
    injectStyles = true,
    replaceColor = (x) => x,
    logLevel = 'warn',
    host = defaultHost,
    getLineTransformers = getDefaultLineTransformers,
    ...rest
  } = {},
  cache
) {
  logger.setLevel(logLevel)

  validateOptions({
    theme,
    wrapperClassName,
    languageAliases,
    extensions,
    getLineClassName,
    injectStyles,
    replaceColor,
    logLevel,
    host,
    getLineTransformers,
  })
  await processExtensions(extensions, host, cache)
  return {
    theme,
    wrapperClassName,
    languageAliases,
    extensions,
    getLineClassName,
    injectStyles,
    replaceColor,
    logLevel,
    host,
    getLineTransformers,
    ...rest,
  }
}
