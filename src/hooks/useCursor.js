import { useCallback } from 'react'

// Stub: o Button.jsx original espera um cursor customizado que reage a
// hover (variant tracker). Esse sistema não existe nesse projeto ainda —
// isso só evita que o componente quebre até (se) ele for construído.
export function useCursorDispatch() {
  return useCallback(() => {}, [])
}
