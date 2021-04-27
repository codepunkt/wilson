import { FunctionalComponent, JSX } from 'preact'
import { useLocation } from 'preact-iso'

const Link: FunctionalComponent<
  JSX.HTMLAttributes & {
    href: string
  }
> = ({ children, href, ...rest }) => {
  const location = useLocation()
  const isActive = location.url === href

  return (
    <a href={href} data-active={isActive} {...rest}>
      {children}
    </a>
  )
}

export default Link
