import { Frontmatter } from 'wilson'
import { FunctionalComponent } from 'preact'
import classes from './default.module.scss'

const DefaultLayout: FunctionalComponent<{ frontmatter: Frontmatter }> = ({
  children,
  frontmatter,
}) => {
  return (
    <div className={classes.container}>
      <main>{children}</main>
    </div>
  )
}

export default DefaultLayout
