---
title: Comparison
taxonomies:
  tags:
    - docs
    - Wat the Eff?
  categories:
    - writing
---

foo `js•const foo = 'bar';` bar

```js {numberLines}
/** @jsx jsx */
import { css, jsx } from '@emotion/core'
import { BREAKS } from '../settings'

export const Button = ({ ...props }) => (
  <button
    css={css`
      background: var(--color-primary-light);
      [data-mode='dark'] & {
        background: var(--color-primary-dark);
      }
      padding: 2px 4px;
      @media (min-width: ${BREAKS.TABLET_PORTRAIT}px) {
        padding: 4px 9px;
      }
    `}
    {...props}
  />
)
```
