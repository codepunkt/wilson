import { LayoutProps } from 'wilson'
import { createContext, FunctionalComponent } from 'preact'
import classes from './docs.module.scss'
import Header from '../components/header'
import Link from '../components/link'
import { useLocation } from 'preact-iso'
import { useContext, useEffect, useState } from 'preact/hooks'
import '../assets/global.scss'

const ActiveSectionContext = createContext<string | null>(null)

const Toc: FunctionalComponent<{
  toc: LayoutProps['toc']
}> = ({ toc }) => {
  const activeSection = useContext(ActiveSectionContext)
  const baseLevel = toc[0].level
  return (
    <ol className={classes.links}>
      {toc.map((l, ci) => {
        const nextIndex = toc.findIndex(
          (h, i) => i > ci && h.level === baseLevel
        )
        return l.level === baseLevel ? (
          <MenuItem
            isActive={activeSection === l.slug}
            showToc
            toc={toc.filter(
              (h, i) =>
                i > ci &&
                h.level > baseLevel &&
                h.level < 4 &&
                (nextIndex !== -1 ? i < nextIndex : true)
            )}
            href={`#${l.slug}`}
          >
            {l.text}
          </MenuItem>
        ) : null
      })}
    </ol>
  )
}

const MenuItem: FunctionalComponent<{
  href: string
  isActive?: boolean
  toc: LayoutProps['toc']
  showToc?: boolean
}> = ({ children, href, isActive = false, toc, showToc = false }) => {
  const url = useLocation().url
  return (
    <li data-active={isActive}>
      <Link href={href}>{children}</Link>
      {toc.length > 0 && (showToc || url === href) && <Toc toc={toc} />}
    </li>
  )
}

const DocsLayout: FunctionalComponent<LayoutProps> = ({
  children,
  title,
  tags,
  tableOfContents,
}) => {
  const [activeSection, setActiveSection] = useState<string | null>(null)
  useEffect(() => {
    const headlines = Array.from(document.querySelectorAll('main h2, main h3'))
    const previousRatio: Record<string, number> = {}
    const previousY: Record<string, number> = {}
    const handleIntersect = (entries: IntersectionObserverEntry[]): void => {
      entries.forEach(
        ({ intersectionRatio, boundingClientRect: { y }, target }) => {
          const id = target.getAttribute('id')!
          if (
            // down scroll
            ((previousRatio[id] ?? -1) > intersectionRatio &&
              (previousY[id] ?? -Infinity) > y) ||
            // up scroll
            ((previousRatio[id] ?? 2) < intersectionRatio &&
              (previousY[id] ?? Infinity) < y)
          ) {
            setActiveSection(id)
          }
          previousRatio[id] = intersectionRatio
          previousY[id] = y
        }
      )
    }
    const observer = new IntersectionObserver(handleIntersect, {
      threshold: [0, 1],
    })
    headlines.forEach((headline) => observer.observe(headline))
    return () => observer.disconnect()
  }, [])

  return (
    <div className={classes.container}>
      <Header withLogo />
      <main className={classes.main}>
        <aside className={classes.toc}>
          <p className={classes.headline}>Documentation</p>
          <ol className={`${classes.links} ${classes.toplevel}`}>
            <ActiveSectionContext.Provider value={activeSection}>
              <MenuItem toc={tableOfContents} href="/docs/why/">
                Why Wilson?
              </MenuItem>
              <MenuItem toc={tableOfContents} href="/docs/glossary/">
                Glossary
              </MenuItem>
              <MenuItem toc={tableOfContents} href="/docs/">
                Getting started
              </MenuItem>
              <MenuItem toc={tableOfContents} href="/docs/features/">
                Features
              </MenuItem>
              <MenuItem toc={tableOfContents} href="/docs/deploy/">
                Deploying
              </MenuItem>
              <MenuItem toc={tableOfContents} href="/docs/comparison/">
                Comparison
              </MenuItem>
            </ActiveSectionContext.Provider>
          </ol>
        </aside>
        <article className={classes.markdown}>
          <h1>{title}</h1>
          <h2>Tags</h2>
          <ul>
            {tags.map((tag: string) => (
              <li key={tag}>
                <a href={`/tag/${tag}/`}>{tag}</a>
              </li>
            ))}
          </ul>
          {children}
        </article>
      </main>
    </div>
  )
}

export default DocsLayout
