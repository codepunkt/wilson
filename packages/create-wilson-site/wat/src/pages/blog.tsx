import { Frontmatter } from 'wilson'
import { FunctionalComponent } from 'preact'
import { markdownPages } from 'wilson/virtual'

export const Page: FunctionalComponent = () => {
  return (
    <div class="container">
      <h1>Blog posts</h1>
      <div className="paper">{JSON.stringify(markdownPages, null, 2)}</div>
    </div>
  )
}

export const frontmatter: Frontmatter = {
  title: 'Blog posts',
}
