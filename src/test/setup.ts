// Registra los matchers de jest-dom (toBeInTheDocument, toHaveAttribute...) en Vitest
// y limpia el DOM entre pruebas.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
