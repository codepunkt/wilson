import { FunctionalComponent } from 'preact'
import { TaxonomyPageProps, TaxonomyFrontmatter } from 'wilson'

export const Page: FunctionalComponent<TaxonomyPageProps> = ({
  pagination,
  title,
  contentPages,
}) => {
  return (
    <>
      <h1>{title}</h1>
      <ul>
        {contentPages.map((page) => (
          <li key={page.title}>
            <a href={page.route}>{page.title}</a>
          </li>
        ))}
      </ul>
      {pagination.previousPage && (
        <a href={pagination.previousPage}>&lt; Previous</a>
      )}
      {pagination.nextPage && <a href={pagination.nextPage}>Next &gt;</a>}
    </>
  )
}

export const frontmatter: TaxonomyFrontmatter = {
  type: 'taxonomy',
  taxonomyName: 'tags',
  title: 'Tag: ${term}',
  permalink: '/tags/${term}/',
}
