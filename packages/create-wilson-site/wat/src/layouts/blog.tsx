import { LayoutProps } from 'wilson'
import { FunctionalComponent } from 'preact'
import classes from './blog.module.scss'

const BlogLayout: FunctionalComponent<LayoutProps> = ({
  children,
  frontmatter,
  toc,
}) => {
  return (
    <div className={classes.container}>
      <main className={classes.main}>
        <article className={classes.markdown}>
          <h1>Table of contents</h1>
          <div>wat</div>
          <h1>{frontmatter.title}</h1>
          {children}
        </article>
      </main>
    </div>
  )
}

export default BlogLayout
