export interface AsyncState<T> {
  data: T
  loading: boolean
  error: string | null
}
