import { Suspense } from 'react'
// Sub-barrel (no './components'): el barrel raíz re-exporta los componentes del dashboard y los arrastraría
// al chunk inicial en vez de dejarlos en el chunk perezoso de la página.
import { AppLayout, ErrorBoundary, PageSkeleton } from './components/layout'
import { AuthProvider } from './context'
import { navigate, usePathname } from './router'
import { NAV_LINKS, NotFoundRoute, routes } from './routes'

/**
 * Shell de la app: layout + sesión + ruta actual. Las rutas secundarias se cargan con React.lazy (code splitting);
 * mientras llega su chunk se muestra PageSkeleton y, si la descarga falla, ErrorBoundary ofrece recargar.
 */
export default function App() {
  const pathname = usePathname()
  const Page = routes[pathname] ?? NotFoundRoute

  return (
    <AuthProvider>
      <AppLayout nav={NAV_LINKS} currentPath={pathname} onNavigate={navigate}>
        <ErrorBoundary key={pathname}>
          <Suspense fallback={<PageSkeleton />}>
            <Page />
          </Suspense>
        </ErrorBoundary>
      </AppLayout>
    </AuthProvider>
  )
}
