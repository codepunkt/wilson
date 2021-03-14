import { Link, Route, Switch } from 'react-router-dom'

// @ts-ignore
const pages = import.meta.globEager('../pages/**/*.(tsx|md)')

const routes = Object.keys(pages).map((path) => {
  const name = path.match(/\.\.\/pages\/(.*)\.(tsx|md)$/)![1]

  return {
    name,
    path: `/${name.toLowerCase().replace(/index$/, '')}/`.replace(/\/\/$/, '/'),
    component: pages[path].default,
  }
})

export function App() {
  return (
    <>
      <nav>
        <ul>
          {routes.map(({ name, path }) => {
            return (
              <li key={path}>
                <Link to={path}>{name}</Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <Switch>
        {routes.map(({ path, component: RouteComponent }) => {
          return (
            <Route key={path} path={path} exact>
              <RouteComponent />
            </Route>
          )
        })}
        <Route>
          <h1>Not Found</h1>
        </Route>
      </Switch>
    </>
  )
}
