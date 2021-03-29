import classes from './MarkdownLayout.module.scss'
import { Frontmatter } from 'wilson'

interface Props {
  children: React.ReactNode
  frontmatter: Frontmatter
}

export default function MarkdownLayout({ children, frontmatter }: Props) {
  console.log(frontmatter)
  return (
    <>
      <h1 className={classes.headline}>{frontmatter.title}</h1>
      {children}
    </>
  )
}
