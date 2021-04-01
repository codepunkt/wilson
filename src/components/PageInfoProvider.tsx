import { createContext, ReactNode, useContext } from 'react'
import { Page } from 'wilson'

interface PageInfoProviderProps {
  children: ReactNode
  pages: Page[]
}

const PageInfoContext = createContext<Page[]>([])

export default function PageInfoProvider({
  children,
  pages,
}: PageInfoProviderProps) {
  return (
    <PageInfoContext.Provider value={pages}>
      {children}
    </PageInfoContext.Provider>
  )
}

export function usePageInfo(): Page[] {
  const pageInfo = useContext(PageInfoContext)
  return pageInfo
}
