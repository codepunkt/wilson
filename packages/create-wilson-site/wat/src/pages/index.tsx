import { Frontmatter } from 'wilson'
import { FunctionalComponent } from 'preact'
import classes from './index.module.scss'
import { useState } from 'preact/hooks'

export const Page: FunctionalComponent = () => {
  const [interactionCount, setInteractionCount] = useState<number>(0)
  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <div class="container">
      <img className={classes.logo} alt="Wilson logo" src="/favicon.svg" />
      <h1>Welcome to Wilson</h1>
      {isDevelopment && (
        <div className="paper">
          <button
            className={classes.counter}
            onClick={() => setInteractionCount(interactionCount + 1)}
          >
            Count is: <b>{interactionCount}</b>
          </button>
          <p className={classes.hotmodule}>
            Edit <code>pages/index.tsx</code> to test hot module replacement
          </p>
        </div>
      )}
    </div>
  )
}

export const frontmatter: Frontmatter = {
  title: 'Welcome to Wilson',
}
