/**
 * Yield array of arrays containing `size` elements each.
 *
 * Example:
 *
 * async function* xs() {
 *   for (let index = 0; index < 10; index++) {
 *     yield index;
 *   }
 * }
 *
 * > for await (const i of chunk(xs(), 3)) {
 *     console.log(`Yielded: ${i}`);
 *   }
 * Yielded: [0, 1, 2]
 * Yielded: [3, 4, 5]
 * Yielded: [6, 7, 8]
 * Yielded: [9]
 */
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

  if (0 !== chunk.length) yield chunk;
}
