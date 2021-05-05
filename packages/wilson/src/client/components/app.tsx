import { routes, siteData, PageProvider } from 'wilson/virtual'
import { ErrorBoundary, LocationProvider, Router } from 'preact-iso'
import { FunctionalComponent } from 'preact'
import { useTitleTemplate } from 'hoofd/preact'

const NotFound: FunctionalComponent = () => <>Not Found</>

const App: FunctionalComponent = () => {
  useTitleTemplate(siteData.titleTemplate)

  return (
    <PageProvider>
      <LocationProvider>
        <div>
          <ErrorBoundary>
            <Router>{[...routes, <NotFound key="notFound" default />]}</Router>
          </ErrorBoundary>
        </div>
      </LocationProvider>
    </PageProvider>
  )
}

export default App
