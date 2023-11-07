export async function* chunk<T>(
  iterable: AsyncIterable<T>,
  size: number,
): AsyncIterable<Array<T>> {
  let chunk: Array<T> = [];

  for await (const e of iterable) {
    chunk.push(e);

    if (chunk.length === size) {
      yield chunk;
      chunk = [];
    }
  }

  yield chunk;
}
