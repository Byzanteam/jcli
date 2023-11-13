export type ValuesType<T extends ReadonlyArray<unknown> | ArrayLike<unknown>> =
  T extends ReadonlyArray<infer E> ? E
    : T extends ArrayLike<infer E> ? E
    : never;
