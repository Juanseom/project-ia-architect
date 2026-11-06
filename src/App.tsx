import { AppLayout } from './components'
import { AuthProvider } from './context'
import { EmissionsTracker } from './pages'

// InventoryPage (dominio EcoTech) sigue disponible en pages/; el lab EcoTrack monta el dashboard.
export default function App() {
  return (
    <AuthProvider>
      <AppLayout>
        <EmissionsTracker />
      </AppLayout>
    </AuthProvider>
  )
}
