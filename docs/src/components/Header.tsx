import { FunctionalComponent } from 'preact'

const Menu: FunctionalComponent = () => (
  <>
    <a href="/">Home</a>
    <a href="/writing/">Writing</a>
    <a href="/about/">About</a>
    <a href="/wat/">404</a>
  </>
)

const Header: FunctionalComponent = ({ children }) => (
  <>
    <Menu />
    {children}
  </>
)

export default Header
