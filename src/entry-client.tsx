// @todo StrictMode?
// import { StrictMode } from 'react'
import { render, hydrate } from 'react-dom'
import { BrowserRouter } from 'react-router-dom'
import { App } from './components/App'

const targetElement = document.getElementById('root')
const jsx = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
)

// @TODO: does adding both render and hydrate here add to the production artifact size? fix this if it does!
// @ts-ignore
import.meta.env.MODE === 'development'
  ? render(jsx, targetElement)
  : window.setTimeout(() => hydrate(jsx, targetElement), 5000)
