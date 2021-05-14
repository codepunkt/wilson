import { FunctionalComponent } from 'preact'
import { SelectPageProps, Frontmatter } from 'wilson'

export const Page: FunctionalComponent<SelectPageProps> = ({
  paginationInfo,
  title,
  taxonomyPages,
}) => {
  return (
    <>
      <h1>{title}</h1>
      <pre>{JSON.stringify(taxonomyPages, null, 2)}</pre>
      {paginationInfo.hasPreviousPage && (
        <a
          href={
            paginationInfo.currentPage === 2
              ? '/writing/'
              : `/writing/page-${paginationInfo.currentPage - 1}/`
          }
        >
          &lt; Previous
        </a>
      )}
      {paginationInfo.hasNextPage && (
        <a href={`/writing/page-${paginationInfo.currentPage + 1}/`}>
          Next &gt;
        </a>
      )}
    </>
  )
}

export const frontmatter: Frontmatter = {
  title: 'Writing',
  kind: 'select',
  taxonomyName: 'categories',
  selectedTerms: ['writing'],
}
