import './App.scss'
import Header from './Header'
import { routes } from 'wilson/virtual'
import { ErrorBoundary, LocationProvider, Router } from 'preact-iso'
import { FunctionalComponent } from 'preact'

export const App: FunctionalComponent<{ url?: string }> = ({ url }) => {
  return (
    <>
      <Header />
      <LocationProvider>
        <div>
          <ErrorBoundary>
            <Router>{routes}</Router>
          </ErrorBoundary>
        </div>
      </LocationProvider>
    </>
  )
}
