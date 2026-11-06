import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage, inventoryService } from '../services'
import type { Product } from '../types'
import { useAuth } from './useAuth'

export interface UseProductsResult {
  products: readonly Product[]
  loading: boolean
  /** Error de carga ya traducido (o null). */
  error: string | null
  /** Error de la última acción (eliminar), sin reemplazar el listado. */
  actionError: string | null
  reload: () => void
  removeProduct: (id: string) => Promise<void>
}

interface LoadResult {
  key: string
  products: readonly Product[]
  error: string | null
}

/**
 * Lógica del inventario (dominio EcoTech). Lab 5: antes consultaba sin esperar la sesión (RLS devolvía 0 filas),
 * mostraba el mensaje crudo de Postgres y no manejaba errores al eliminar. Ahora sigue el patrón de useEmissions.
 */
export function useProducts(): UseProductsResult {
  const auth = useAuth()
  const userId = auth.status === 'ready' ? auth.user.id : null
  const [reloadToken, setReloadToken] = useState(0)
  const [result, setResult] = useState<LoadResult | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const requestKey = userId === null ? null : `${userId}:${reloadToken}`

  useEffect(() => {
    if (requestKey === null) return
    let active = true
    inventoryService
      .getProducts()
      .then((products) => {
        if (active) setResult({ key: requestKey, products, error: null })
      })
      .catch((e: unknown) => {
        if (active) setResult({ key: requestKey, products: [], error: getErrorMessage(e) })
      })
    return () => {
      active = false
    }
  }, [requestKey])

  const reload = useCallback(() => setReloadToken((n) => n + 1), [])

  const removeProduct = useCallback(async (id: string) => {
    setActionError(null)
    try {
      await inventoryService.deleteProduct(id)
      setResult((prev) => prev && { ...prev, products: prev.products.filter((p) => p.id !== id) })
    } catch (e: unknown) {
      setActionError(getErrorMessage(e))
    }
  }, [])

  const current = result !== null && result.key === requestKey ? result : null
  return {
    products: current?.products ?? [],
    loading: auth.status === 'loading' || (requestKey !== null && current === null),
    error: auth.status === 'error' ? auth.error : (current?.error ?? null),
    actionError,
    reload,
    removeProduct,
  }
}
