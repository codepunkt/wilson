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
        {taxonomyTerms.map((term) => (
          <li key={term}>
            <a href={`/tags/${term}/`}>{term}</a>
          </li>
        ))}
      </ul>
    </>
  )
}

export const frontmatter: Partial<Frontmatter> = {
  title: 'Tagcloud',
  kind: 'terms',
  taxonomyName: 'tags',
}
