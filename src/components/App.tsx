import { Route, Switch } from 'react-router-dom'
import './App.module.scss'
import Header from './Header'
import { routes } from 'wilson/virtual'

export function App() {
  return (
    <>
      <Header />
      <Switch>
        {routes}
        <Route>
          <h1>Not Found</h1>
        </Route>
      </Switch>
    </>
  )
}
