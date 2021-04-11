import { FunctionalComponent } from 'preact'
import { markdownPages } from 'wilson/virtual'

const WritingPage: FunctionalComponent = () => (
  <>
    <h1>Writing</h1>
    {markdownPages.map(({ result: { url }, frontmatter }) => {
      return (
        <li key={url}>
          <a href={url}>{frontmatter?.title ?? url}</a>
        </li>
      )
    })}
  </>
)

export default WritingPage
