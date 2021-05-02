import { FunctionalComponent } from 'preact'
import { ComponentProps, Frontmatter } from 'wilson'

export const Page: FunctionalComponent<ComponentProps> = ({
  title,
  inject: { pages },
}) => {
  return (
    <>
      <h1>{title}</h1>
      <ul>
        {pages &&
          pages.map((page) => (
            <li key={page.frontmatter.title}>
              <a href={page.route}>{page.frontmatter.title}</a>
            </li>
          ))}
      </ul>
    </>
  )
}

export const frontmatter: Partial<Frontmatter> = {
  title: 'Tag cloud',
  inject: {
    pages: {
      tags: ['posttax'],
    },
  },
}
