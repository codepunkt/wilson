import { FunctionalComponent } from 'preact'
import { ComponentProps, Frontmatter } from 'wilson'

export const Page: FunctionalComponent<ComponentProps> = ({
  title,
  inject: { pages },
}) => {
  return (
    <>
      <h1>{title}</h1>
      <pre>{JSON.stringify(pages, null, 2)}</pre>
    </>
  )
}

export const frontmatter: Frontmatter = {
  title: 'Blog posts',
  inject: {
    pages: {
      tags: ['docs'],
    },
  },
}
