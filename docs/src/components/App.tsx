import './App.scss'
import Header from './Header'
import { routes, Meta } from 'wilson/virtual'
import { ErrorBoundary, LocationProvider, Router } from 'preact-iso'
import { FunctionalComponent } from 'preact'

const NotFound: FunctionalComponent = () => <>Not Found</>

const App: FunctionalComponent<{ url?: string }> = ({ url }) => {
  return (
    <>
      <Header />
      <Meta />
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
