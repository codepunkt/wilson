import { FunctionalComponent } from 'preact'
import { TermPageProps, Frontmatter } from 'wilson'

export const Page: FunctionalComponent<TermPageProps> = ({
  title,
  taxonomyTerms,
}) => {
  return (
    <>
      <h1>{title}</h1>
      <ul>
        {taxonomyTerms.map(({ name, slug }) => (
          <li key={name}>
            <a href={`/tags/${slug}/`}>{name}</a>
          </li>
        ))}
      </ul>
    </>
  )
}

export const frontmatter: Partial<Frontmatter> = {
  type: 'terms',
  title: 'Tagcloud',
  taxonomyName: 'tags',
}
