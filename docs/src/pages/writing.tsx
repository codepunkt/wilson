import { FunctionalComponent } from 'preact'
import { SelectPageProps, Frontmatter } from 'wilson'

export const Page: FunctionalComponent<SelectPageProps> = ({
  title,
  pagination,
  contentPages,
}) => {
  return (
    <>
      <h1>{title}</h1>
      <pre>{JSON.stringify(contentPages, null, 2)}</pre>
      {pagination.previousPage && (
        <a href={pagination.previousPage}>&lt; Previous</a>
      )}
      {pagination.nextPage && <a href={pagination.nextPage}>Next &gt;</a>}
    </>
  )
}

export const frontmatter: Frontmatter = {
  type: 'select',
  title: 'Writing',
  taxonomyName: 'categories',
  selectedTerms: ['writing'],
}
