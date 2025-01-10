import { assertEquals, describe, it } from "@test/mod.ts";
import { chunk } from "@/utility/async-iterable.ts";

describe("chunk", () => {
  async function* buildItems(count: number) {
    for (let index = 0; index < count; index++) {
      yield index;
    }
  }

  it("items count less than size", async () => {
    const batches = await Array.fromAsync(chunk(buildItems(5), 3));

    assertEquals(batches.length, 2);
    assertEquals(batches[0], [0, 1, 2]);
    assertEquals(batches[1], [3, 4]);
  });
  it("items count more than size", async () => {
    const batches = await Array.fromAsync(chunk(buildItems(4), 5));

    assertEquals(batches.length, 1);
    assertEquals(batches[0], [0, 1, 2, 3]);
  });
});
