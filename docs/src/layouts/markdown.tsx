import classes from './markdown.module.scss'
import { Frontmatter } from 'wilson'
import { FunctionalComponent } from 'preact'

const MarkdownLayout: FunctionalComponent<{ frontmatter: Frontmatter }> = ({
  children,
  frontmatter,
}) => (
  <div className={classes.markdownLayout}>
    <h1>{frontmatter.title}</h1>
    {children}
  </div>
)

export default MarkdownLayout
