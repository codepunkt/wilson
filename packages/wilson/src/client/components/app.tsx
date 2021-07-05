import { routes, siteData } from 'wilson/virtual'
import { ErrorBoundary, LocationProvider, Router } from 'preact-iso'
import { FunctionalComponent } from 'preact'
import { useTitleTemplate } from 'hoofd/preact'
import { AutoPrefetchProvider } from '../context/prefetch'

const NotFound: FunctionalComponent = () => <>Not Found</>

const App: FunctionalComponent = () => {
  useTitleTemplate(siteData.titleTemplate)

  return (
    <AutoPrefetchProvider>
      <LocationProvider>
        <div>
          <ErrorBoundary>
            <Router>{[...routes, <NotFound key="notFound" default />]}</Router>
          </ErrorBoundary>
        </div>
      </LocationProvider>
    </AutoPrefetchProvider>
  )
}

export default App
