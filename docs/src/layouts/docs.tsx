import { ContentPageProps } from 'wilson'
import { createContext, FunctionalComponent } from 'preact'
import classes from './docs.module.scss'
import Header from '../components/header'
import Link from '../components/link'
import { useLocation } from 'preact-iso'
import { useContext, useEffect, useState } from 'preact/hooks'
import '../assets/global.scss'

const ActiveSectionContext = createContext<string | null>(null)

const Toc: FunctionalComponent<{
  headings: Exclude<ContentPageProps['headings'], undefined>
}> = ({ headings }) => {
  const activeSection = useContext(ActiveSectionContext)
  const baseLevel = headings[0].level
  return (
    <ol className={classes.links}>
      {headings.map((heading, ci) => {
        const nextIndex = headings.findIndex(
          (h, i) => i > ci && h.level === baseLevel
        )
        return heading.level === baseLevel ? (
          <MenuItem
            isActive={activeSection === heading.slug}
            showToc
            headings={headings.filter(
              (h, i) =>
                i > ci &&
                h.level > baseLevel &&
                h.level < 4 &&
                (nextIndex !== -1 ? i < nextIndex : true)
            )}
            href={`#${heading.slug}`}
          >
            {heading.text}
          </MenuItem>
        ) : null
      })}
    </ol>
  )
}

const MenuItem: FunctionalComponent<{
  href: string
  isActive?: boolean
  headings: Exclude<ContentPageProps['headings'], undefined>
  showToc?: boolean
}> = ({ children, href, isActive = false, headings, showToc = false }) => {
  const url = useLocation().url
  return (
    <li data-active={isActive}>
      <Link href={href}>{children}</Link>
      {headings.length > 0 && (showToc || url === href) && (
        <Toc headings={headings} />
      )}
    </li>
  )
}

const DocsLayout: FunctionalComponent<ContentPageProps> = ({
  children,
  title,
  taxonomies,
  headings = [],
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
              <MenuItem headings={headings} href="/docs/why/">
                Why Wilson?
              </MenuItem>
              <MenuItem headings={headings} href="/docs/glossary/">
                Glossary
              </MenuItem>
              <MenuItem headings={headings} href="/docs/">
                Getting started
              </MenuItem>
              <MenuItem headings={headings} href="/docs/features/">
                Features
              </MenuItem>
              <MenuItem headings={headings} href="/docs/deploy/">
                Deploying
              </MenuItem>
              <MenuItem headings={headings} href="/docs/comparison/">
                Comparison
              </MenuItem>
            </ActiveSectionContext.Provider>
          </ol>
        </aside>
        <article className={classes.markdown}>
          <h1>{title}</h1>
          <h2>Taxonomies</h2>
          <pre>{JSON.stringify(taxonomies, null, 2)}</pre>
          {children}
        </article>
      </main>
    </div>
  )
}

export default DocsLayout
