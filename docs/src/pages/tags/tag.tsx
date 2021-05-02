import { FunctionalComponent } from 'preact'
import { ComponentProps, Frontmatter } from 'wilson'

export const Page: FunctionalComponent<ComponentProps> = ({
  title,
  inject: { pages = [] },
}) => {
  return (
    <>
      <h1>{title}</h1>
      <ul>
        {pages.map((page) => (
          <li key={page.frontmatter.title}>
            <a href={page.route}>{page.frontmatter.title}</a>
          </li>
        ))}
      </ul>
    </>
  )
}

export const frontmatter: Frontmatter = {
  multiple: 'tags',
  title: 'Tag: {{tag}}',
  permalink: '/tag/{{tag}}/',
  tags: ['posttax'],
}
