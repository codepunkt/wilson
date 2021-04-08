import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  children?: ReactNode
}

function Menu() {
  return (
    <>
      <Link to="/">Home</Link>
      <Link to="/writing">Writing</Link>
      <Link to="/about">About</Link>
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
