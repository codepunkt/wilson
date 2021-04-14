import path from 'path'
import typescript from '@rollup/plugin-typescript'
import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import autoExternal from 'rollup-plugin-auto-external'

/**
 * @type { import('rollup').RollupOptions }
 */
const nodeConfig = {
  input: {
    index: path.resolve(__dirname, 'src/index.ts'),
    cli: path.resolve(__dirname, 'src/cli.ts'),
  },
  output: {
    dir: path.resolve(__dirname, 'dist'),
    // entryFileNames: `[name].js`,
    // chunkFileNames: 'chunks/dep-[hash].js',
    exports: 'named',
    format: 'cjs',
    externalLiveBindings: false,
    freeze: false,
    sourcemap: true,
  },
  plugins: [
    autoExternal(),
    nodeResolve({ preferBuiltins: true }),
    typescript({ target: 'es2019', module: 'esnext' }),
    commonjs(),
    json(),
  ],
  treeshake: {
    moduleSideEffects: 'no-external',
    propertyReadSideEffects: false,
    tryCatchDeoptimization: false,
  },
  onwarn(warning, warn) {
    // ignore circular dependency warnings
    if (warning.code === 'CIRCULAR_DEPENDENCY') return
    // ignore empty index bundle
    if (warning.code === 'EMPTY_BUNDLE' && warning.chunkName === 'index') return
    // ignore eval in special file
    if (
      warning.code === 'EVAL' &&
      warning.loc.file === `${__dirname}/src/eval.ts`
    )
      return
    warn(warning)
  },
}

export default [nodeConfig]
