/**
 * naturalSort: ordena strings con números embebidos de forma humana.
 * Ejemplos: BNI-G1, BNI-G2, ..., BNI-G10 (NO BNI-G10 antes de BNI-G2)
 *
 * Uso:
 *   arr.sort((a, b) => naturalSort(a.name, b.name))
 *   arr.sort(naturalSortBy('code'))
 */

export function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

/**
 * Comparador listo para usar con Array.sort sobre objetos.
 * @param key - campo del objeto a ordenar
 */
export function naturalSortBy<T>(key: keyof T) {
  return (a: T, b: T): number =>
    naturalSort(String(a[key] ?? ''), String(b[key] ?? ''))
}
