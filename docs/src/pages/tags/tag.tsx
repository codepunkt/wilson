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
  kind: 'taxonomy',
  taxonomyName: 'tags',
  title: 'Tag: ${term}',
  permalink: '/tags/${term}/',
}

/**
 * Different page kinds
 * ====================
 *
 * content: CONTENT PAGE (markdown & typescript)
 * - a normal content page that is annotated with any combination
 *   of taxonomy terms
 *
 *   e.g. markdown with categories 'writing',
 *                      tags 'javascript' & 'react'
 *
 * terms: TAXONOMY TERMS LIST (typescript)
 * - a page for a specific taxonomy that lists all terms of this
 *   taxonomy that content pages have been annotated with
 *
 *   e.g. tag cloud 'javascript', 'react', 'nodejs', 'cloud infra'
 *
 * taxonomy: TAXONOMY PAGE LIST PER TERM (typescript)
 * - multiple pages for a specific taxonomy, one for each term of
 *   the taxonomy, that list all content pages that are annotated
 *   with the respective term
 *
 *   e.g. create tag pages for every tag
 *
 * select: TAXONOMY PAGE LIST (typescript)
 * - a page for a specific taxonomy that lists each content page
 *   that has respective annotations included in a given set of tags
 *
 *   e.g. list all pages that have a category of 'writing' or 'blog'
 */
