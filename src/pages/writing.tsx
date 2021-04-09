import { markdownPages } from 'wilson/virtual'

export default function WritingPage() {
  return (
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
}
