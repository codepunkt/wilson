import { FunctionalComponent } from 'preact'
import classes from './default.module.scss'
import Header from '../components/header'
import '../assets/global.scss'

const HomeLayout: FunctionalComponent = ({ children }) => {
  return (
    <div className={classes.container}>
      <Header />
      <main className={classes.main}>{children}</main>
    </div>
  )
}

export default HomeLayout
