import { Link } from 'react-router-dom'
import { markdownPages } from 'wilson/virtual'

export default function WritingPage() {
  return (
    <>
      <h1>Writing</h1>
      {markdownPages.map(({ result: { url }, frontmatter }) => {
        return (
          <li key={url}>
            <Link to={url}>{frontmatter?.title ?? url}</Link>
          </li>
        )
      })}
    </>
  )
}
