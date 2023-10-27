import { FS, WriteFileOptions } from "@/api/mod.ts";
import { makeJSONSerializer } from "@/jcli/config/json-serializer.ts";

export interface ConfigSerializer<T> {
  serialize(config: T): Promise<string>;
  deserialize(data: string): Promise<T>;
}

export abstract class ConfigBase<T> {
  #path: string;
  #data: T | undefined = undefined;
  #serializer: ConfigSerializer<T>;

  constructor(path: string, options?: { serializer?: ConfigSerializer<T> }) {
    this.#path = path;
    this.#serializer = options?.serializer ?? makeJSONSerializer();
  }

  async get() {
    if (undefined === this.#data) {
      const data = await this._fs.readTextFile(this.#path);
      const deserializedData = await this.#serializer.deserialize(data);
      this.#data = deserializedData;
    }

    return this.#data;
  }

  async set(data: T, options?: WriteFileOptions) {
    const serializedData = await this.#serializer.serialize(data);
    await this._fs.writeTextFile(this.#path, serializedData, options);
    this.#data = data;
  }

  abstract _fs: FS;
}
