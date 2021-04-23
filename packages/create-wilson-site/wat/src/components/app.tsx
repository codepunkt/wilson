import { routes, siteData } from 'wilson/virtual'
import { ErrorBoundary, LocationProvider, Router } from 'preact-iso'
import { FunctionalComponent } from 'preact'
import { useTitleTemplate } from 'hoofd/preact'
// global styles
import './app.scss'

const NotFound: FunctionalComponent = () => <>Not Found</>

const App: FunctionalComponent = () => {
  useTitleTemplate(siteData.titleTemplate)
  return (
    <LocationProvider>
      <div>
        <nav>
          <a href="/">Home</a>
          <a href="/blog/">Blog</a>
        </nav>
        <ErrorBoundary>
          <Router>{[...routes, <NotFound default />]}</Router>
        </ErrorBoundary>
      </div>
    </LocationProvider>
  )
}

export default App
