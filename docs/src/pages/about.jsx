import classes from './about.module.scss'

export const Page = () => (
  <h1 className={classes.headline}>{frontmatter.title}</h1>
)

export const frontmatter = {
  title: 'About',
  draft: false,
}
