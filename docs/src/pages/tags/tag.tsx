import { FunctionalComponent } from 'preact'
import { TaxonomyPageProps, Frontmatter } from 'wilson'

export const Page: FunctionalComponent<TaxonomyPageProps> = ({
  title,
  taxonomyPages,
}) => {
  return (
    <>
      <h1>{title}</h1>
      <ul>
        {taxonomyPages.map((page) => (
          <li key={page.title}>
            <a href={page.route}>{page.title}</a>
          </li>
        ))}
      </ul>
    </>
  )
}

/**
 * @todo validate that kind: taxonomy pages don't have taxonomies themselves
 */
export const frontmatter: Frontmatter = {
  kind: 'taxonomy',
  taxonomyName: 'tags',
  title: 'Tag: {{tag}}',
  permalink: '/tags/{{tag}}/',
}
