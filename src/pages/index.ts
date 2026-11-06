// Las páginas se cargan con React.lazy desde src/routes.ts (importando el archivo, no este barrel),
// para que cada una sea un chunk aparte. Este barrel queda para tests y usos no perezosos.
export { InventoryPage } from './InventoryPage'
export { EmissionsTracker } from './EmissionsTracker'
export { NotFoundPage } from './NotFoundPage'
