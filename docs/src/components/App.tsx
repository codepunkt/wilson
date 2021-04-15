import './app.scss'
import Header from './header'
import { routes, siteData } from 'wilson/virtual'
import { ErrorBoundary, LocationProvider, Router } from 'preact-iso'
import { FunctionalComponent } from 'preact'
import { useTitleTemplate } from 'hoofd/preact'

const NotFound: FunctionalComponent = () => <>Not Found</>

const App: FunctionalComponent = () => {
  useTitleTemplate(siteData.titleTemplate)
  return (
    <>
      <Header />
      <LocationProvider>
        <div>
          <ErrorBoundary>
            <Router>{[...routes, <NotFound default />]}</Router>
          </ErrorBoundary>
        </div>
      </LocationProvider>
    </>
  )
}

export default App
