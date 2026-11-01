import { AppLayout } from './components'
import { AuthProvider } from './context'
import { InventoryPage } from './pages'

export default function App() {
  return (
    <AuthProvider>
      <AppLayout>
        <InventoryPage />
      </AppLayout>
    </AuthProvider>
  )
}
