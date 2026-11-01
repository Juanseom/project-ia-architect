import { useCallback, useEffect, useState } from 'react'
import { inventoryService } from '../services'
import type { AsyncState, NewProduct, Product } from '../types'

// Lógica de negocio del inventario: estado, carga y mutaciones. La UI solo consume.
export function useProducts() {
  const [state, setState] = useState<AsyncState<Product[]>>({ data: [], loading: true, error: null })

  const load = useCallback(async () => {
    try {
      setState({ data: await inventoryService.getProducts(), loading: false, error: null })
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: (e as Error).message }))
    }
  }, [])

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    await load()
  }, [load])

  const addProduct = useCallback(async (input: NewProduct) => {
    const created = await inventoryService.createProduct(input)
    setState((s) => ({ ...s, data: [created, ...s.data] }))
  }, [])

  const removeProduct = useCallback(async (id: string) => {
    await inventoryService.deleteProduct(id)
    setState((s) => ({ ...s, data: s.data.filter((p) => p.id !== id) }))
  }, [])

  useEffect(() => {
    let ignore = false
    inventoryService
      .getProducts()
      .then((data) => !ignore && setState({ data, loading: false, error: null }))
      .catch((e: Error) => !ignore && setState((s) => ({ ...s, loading: false, error: e.message })))
    return () => {
      ignore = true
    }
  }, [])

  return { ...state, refresh, addProduct, removeProduct }
}
