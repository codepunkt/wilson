import { ComponentChildren } from 'preact'

interface Props {
  children?: ComponentChildren
}

function Menu() {
  return (
    <>
      <a href="/">Home</a>
      <a href="/writing/">Writing</a>
      <a href="/about/">About</a>
    </>
  )
}

export default function Header({ children }: Props) {
  return (
    <>
      <Menu />
      {children}
    </>
  )
}
