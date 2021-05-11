import { FunctionalComponent } from 'preact'
import { TaxonomyPageProps, Frontmatter } from 'wilson'

export const Page: FunctionalComponent<TaxonomyPageProps> = ({
  title,
  taxonomyPages,
}) => {
  return (
    <>
      <h1>{title}</h1>
      <pre>{JSON.stringify(taxonomyPages, null, 2)}</pre>
    </>
  )
}

export const frontmatter: Frontmatter = {
  title: 'Writing',
  kind: 'select',
  taxonomyName: 'categories',
  selectedTerms: ['writing'],
}
