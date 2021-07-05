---
title: Syntax highlighting
taxonomies:
  tags:
    - docs
---

Syntax highlighting, both inline like this: `js•const foo = 'bar';` and code blocks like the following one, work out of the box.

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
