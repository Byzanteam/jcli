import { api, WriteFileOptions } from "@/api/mod.ts";
import { makeJSONSerializer } from "@/jcli/config/json-serializer.ts";

export interface ConfigSerializer<T> {
  serialize(config: T): Promise<string>;
  deserialize(data: string): Promise<T>;
}

export class Config<T> {
  #path: string;
  #data: T | undefined;
  #serializer: ConfigSerializer<T>;

  constructor(path: string, options?: { serializer?: ConfigSerializer<T> }) {
    this.#path = path;
    this.#serializer = options?.serializer ?? makeJSONSerializer<T>();
  }

  async get() {
    if (undefined === this.#data) {
      const path = await api.fs.realPath(this.#path);
      const data = await api.fs.readTextFile(path);
      const deserializedData = await this.#serializer.deserialize(data);
      this.#data = deserializedData;
    }

    return this.#data;
  }

  async set(data: T, options?: WriteFileOptions) {
    const serializedData = await this.#serializer.serialize(data);
    await api.fs.writeTextFile(this.#path, `${serializedData}\n`, options);
    this.#data = data;
  }
}
