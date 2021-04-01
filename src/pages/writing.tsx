import { Link, useParams } from 'react-router-dom'
import { markdownPages } from 'wilson/virtual'

export default function WritingPage() {
  const { page } = useParams<{ page: string | undefined }>()

  console.log({ page })

  return (
    <>
      <h1>Writing</h1>
      {markdownPages.map(({ url, frontmatter }) => {
        return (
          <li key={url}>
            <Link to={url}>{frontmatter?.title ?? url}</Link>
          </li>
        )
      })}
    </>
  )
}
