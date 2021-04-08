# What this is

- Static site generator for React and Markdown contents
- Basic mindset: Opinionated, fast, lean, convention over configuration
- Uses SCSS modules for styling

# What this is not

- A feature-comparable replacement for Gatsby

# Loadable notes

## `loadableReady` before `hydrate` on client

- parse JSON content from `#__LOADABLE_REQUIRED_CHUNKS__` element
- parse JSON content from `#__LOADABLE_REQUIRED_CHUNKS___ext` element
  - if element doesnt exist: @loadable/component !== @loadable/server error
  - otherwise: read `namedChunks` arr prop and set `LOADABLE_SHARED.initialChunks[chunkName]` to `true` for each.
    > unsure: is used in loadable. why?
- resolves after all required chunks are loaded.
  > unsure: how is this checked? is likely that all `LOADABLE_REQUIRED_CHUNKS` have to be added as sync script tags.

## `loadable`

- understand when this loads stuff synchronously and why this is currently
  not happening in SSR
