import { ComponentProps, Frontmatter } from 'wilson'
import { FunctionalComponent } from 'preact'
import classes from './index.module.scss'
import logoSrc from '../assets/wilson.svg'
import InstallButton from '../components/install-button'

export const Page: FunctionalComponent<ComponentProps> = () => {
  return (
    <>
      <div className={classes.hero}>
        <div className={classes.logo}>
          <img src={logoSrc} width="70" height="80" alt="Wilsonjs Logo" />
          <span>wilson</span>
        </div>
        <h1 className={classes.claim}>{frontmatter.title}.</h1>
        <p className={classes.description}>
          Based on <a href="https://preactjs.com/">Preact</a> and{' '}
          <a href="https://vitejs.dev/">Vite</a>, Wilson makes the hardest parts
          of building an amazing experience simple and stays out of your way for
          everything else.
        </p>
        <div className={classes.ctaWrapper}>
          <a href="/docs/" className={classes.cta}>
            Get started
          </a>
          <InstallButton />
        </div>
      </div>
      <div>
        <ul>
          <li>
            <b>Instant Server Start</b> On demand file serving over native ESM,
            no bundling required!
          </li>
          <li>
            <b>Lightning Fast HMR</b>Hot Module Replacement (HMR) that stays
            fast regardless of app size.
          </li>
          <li>
            <b>Preact + SPA</b>
            JSX, Performance optimized, all SPA benefits, none of the cruft
          </li>
          <li>
            <b>Optimized Build</b>
            Pre-configured Rollup build with automated page-level lazy loading.
          </li>
          <li>
            <b>Markdown support</b>
            Automatic TOC creation, linking of headers
          </li>
          <li>
            <b>Syntax highlighting</b>
            Best in class syntax highlighting based on Visual Studio Code
          </li>
          <li>
            <b>Opengraph support</b>
            Amazing, feature complete open graph image generation. Automatically
            defines opengraph meta tags.
          </li>
          <li>
            <b>Fully Typed APIs</b>
            Flexible programmatic APIs with full TypeScript typing.
          </li>
        </ul>
      </div>
    </>
  )
}

export const frontmatter: Frontmatter = {
  title: 'Blazing fast static sites for the modern web',
  draft: false,
}
